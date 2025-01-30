from PIL import Image
import matplotlib.pyplot as plt
import numpy as np
import Steerable_pyramid_filtonly as st_filt

class SteerablePyramid():
    def __init__(self, image, xres, yres, n, k, image_name, out_path, verbose):
        self.XRES = xres # horizontal resolution
        self.YRES = yres # vertical resolution
        self.IMAGE_ARRAY = np.asarray(image, dtype='complex')
        self.IMAGE_NAME = image_name
        
        #		self.OUT_PATH = out_path # path to the directory for saving images.
        self.OUT_PATH = out_path + '/{}' # path to the directory for saving images.
        
        ## validation of num. of orientaion
        self.Ks = [4, 6, 8, 10, 12, 15, 18, 20, 30, 60]
        if not k in self.Ks:
#            LOGGER.error('illegal number of orientation: {}'.format(str(k)))
            raise ValueError('illegal number of orientation: {}'.format(str(k)))
            
        self.K = k # num. of orientation
        ## validation of depth
        _tmp = np.log2(np.min(np.array([xres, yres])))
        
        if n  > _tmp - 1:
#            LOGGER.error('illegal depth: {}'.format(str(n)))
            raise ValueError('illegal depth: {}'.format(str(n)))
        self.N = n # depth
        self.verbose = verbose # verbose

        # Filters
        self.H0_FILT = np.array([])
        self.L0_FILT = np.array([])
        self.L_FILT = []
        self.H_FILT = []
        self.B_FILT = []

        # Pyramids
        self.H0 = {'f':None, 's':None}
        self.L0 = {'f':None, 's':None}
        self.LR = {'f':None, 's':None}
        self.BND = []
        self.LOW = [] #L1, ...LN

        h0_filt,l0_filt,nbfilts,lfilts = st_filt.buildSCFpyr_Filt(self.XRES,self.YRES,ht=self.N,nbands=self.K,twidth=1)
        
        # deforme nbfilts[N][K,filt_xres,filt_yres]  to [N][K][filt_xres,filt_yres]
        nbfilts = [ bfilt for bfilt in [bfilts for bfilts in nbfilts ]]

        self.H0_FILT = h0_filt
        self.L0_FILT = l0_filt
        self.L_FILT  = lfilts
        self.B_FILT  = nbfilts
        
    # create steerable pyramid
    def create_pyramids(self):

        # DFT
        ft = np.fft.fft2(self.IMAGE_ARRAY)
        _ft = np.fft.fftshift(ft)

        # apply highpass filter(H0) and save highpass resudual
        h0 = _ft * self.H0_FILT
        f_ishift = np.fft.ifftshift(h0)
        img_back = np.fft.ifft2(f_ishift)
        # frequency
        self.H0['f'] = h0.copy()
        # space
        self.H0['s'] = img_back.copy().real

        if self.verbose == 1:
            _tmp = np.absolute(img_back)
            Image.fromarray(np.uint8(_tmp), mode='L').save(self.OUT_PATH.format('{}-h0.png'.format(self.IMAGE_NAME)))

        # apply lowpass filter(L0).
        l0 = _ft * self.L0_FILT
        f_ishift = np.fft.ifftshift(l0)
        img_back = np.fft.ifft2(f_ishift)
        self.L0['f'] = l0.copy()
        self.L0['s'] = img_back.copy()

        if self.verbose == 1:
            _tmp = np.absolute(img_back)
            Image.fromarray(np.uint8(_tmp), mode='L').save(self.OUT_PATH.format('{}-l0.png'.format(self.IMAGE_NAME)))

        # apply bandpass filter(B) and downsample iteratively. save pyramid
        _last = l0
        for i in range(self.N):
            _t = []
            for j in range(len(self.B_FILT[i])):
                _tmp = {'f':None, 's':None}
                lb = _last * self.B_FILT[i][j] * ((-1j)**(self.K-1))
                f_ishift = np.fft.ifftshift(lb)
                img_back = np.fft.ifft2(f_ishift)
                # frequency
                _tmp['f'] = lb
                # space
                _tmp['s'] = img_back
                _t.append(_tmp)

                if self.verbose == 1:
                    _tmp = np.absolute(img_back.real)
                    Image.fromarray(np.uint8(_tmp), mode='L').save(self.OUT_PATH.format('{}-layer{}-lb{}.png'.format(self.IMAGE_NAME, str(i), str(j))))

            self.BND.append(_t.copy())

            # apply lowpass filter(L) to image(Fourier Domain) downsampled.
            #l1 = _last * self.L_FILT[i]

            ## Downsampling 1/2
#            down_fil = np.zeros( _last.shape )
#            quant4x = int(down_fil.shape[1]/4)
#            quant4y = int(down_fil.shape[0]/4)

            dims = np.asarray(_last.shape,"float")
            ctr = np.ceil( (dims + 0.5)/2 ).astype("int")
            lodims = np.ceil( (dims - 0.5)/2 ).astype("int")
            loctr = np.ceil( (lodims + 0.5)/2 ).astype("int")
            lostart = ctr - loctr + 1
            loend = lostart + lodims - 1
 
            # extract the central part of DFT change to 
#            down_image = np.zeros( (2*quant4y, 2*quant4x), dtype=complex )
#            down_image = _last[quant4y:3*quant4y, quant4x:3*quant4x]

            down_image = _last[lostart[0]-1:loend[0]-1+1,lostart[1]-1:loend[1]-1+1]
            down_image = down_image * self.L_FILT[i]
            
            f_ishift = np.fft.ifftshift(down_image)
            img_back = np.fft.ifft2(f_ishift)
            self.LOW.append({'f':down_image, 's':img_back})

            if self.verbose == 1:
                _tmp = np.absolute(img_back)
                Image.fromarray(np.uint8(_tmp), mode='L').save(self.OUT_PATH.format('{}-residual-layer{}.png'.format(self.IMAGE_NAME, str(i))))

            _last = down_image

        # lowpass residual
        self.LR['f'] = _last.copy()
        self.LR['s'] = img_back.copy().real

        return None

    def collapse_pyramids(self):
            ims = []
            _resid = self.LR['f']

            for i in range(self.N-1,-1,-1):
                    ## upsample residual
                    _resid = _resid * self.L_FILT[i]

                    _tmp_tup = tuple(int(2*x) for x in _resid.shape)
                    _tmp = np.zeros(_tmp_tup, dtype=np.complex)
                    quant4x = int(_resid.shape[1]/2)
                    quant4y = int(_resid.shape[0]/2)
                    _tmp[quant4y:3*quant4y, quant4x:3*quant4x] = _resid
                    _resid = _tmp

                    for j in range(len(self.B_FILT[i])):
                         _resid += self.BND[i][j]['f'] * self.B_FILT[i][j]

                    ims.append(_resid)
	
# finally reconstruction is done.
            recon = _resid * self.L0_FILT + self.H0['f'] * self.H0_FILT
            return recon,ims
