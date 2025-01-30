import numpy as np
import math


def pointOp(im,lut,origin,increment):
    X = origin + float(increment)*np.arange(0,lut.size)
    Y = lut.flatten()
    res = np.interp(im.flatten(),X,Y)
    res = res.reshape(im.shape)
    return res

def rcosFn(width=1,position=0,values=[0,1]):
    sz = 256
    X = np.pi * np.arange(-sz-1,1+1) / (2*sz)
    Y = values[0] + (values[1] - values[0]) * np.cos(X)**2
    Y[0] = Y[1]
    Y[sz+3-1] = Y[sz+2-1]
    X = position + (2 * width/np.pi) * (X + np.pi/4)
    return X,Y

# This code is matlabPyrtools-master/buildfSCFpyr.m .
# not steermtx and harmonics

def buildSCFpyr_Filt(XRES,YRES,ht=4,nbands=4,twidth=1):
    im_shape = np.array([XRES,YRES])

    max_ht = np.floor( np.log2(min(im_shape) ) ) - 2
    
    if ht > max_ht :
        raise "cannot build pyramid higher than %d levels".format(max_ht)
    else: 
        pass
    
    dims = np.asarray(im_shape,"float")
    ctr = np.ceil( (dims + 0.5)/2 ).astype("int")

    X = np.arange(1,dims[1] + 1) - ctr[1]
    X = X/(dims[1]/2)
    Y = np.arange(1,dims[0] + 1) - ctr[0]
    Y = Y/(dims[0]/2)

    [xramp,yramp] = np.meshgrid( X,Y )
    
    angle = np.arctan2(yramp,xramp)
    log_rad = np.sqrt(xramp**2 + yramp**2)
    log_rad[ctr[0]-1,ctr[1]-1] = log_rad[ctr[0]-1,ctr[1]-2] #0を埋めている
    log_rad = np.log2(log_rad)
    
    #radial transition function
    Xrcos,Yrcos = rcosFn(twidth,(-twidth/2),[0,1])
    Yrcos = np.sqrt(Yrcos)
    
    YIrcos = np.sqrt(1.0 - Yrcos**2)
    lo0mask = pointOp(log_rad,YIrcos,Xrcos[0],Xrcos[1]-Xrcos[0])
    
    bfilts_list,lfilts_list = buildSCFpyrLevs_Filt(XRES, YRES, log_rad, Xrcos, Yrcos, angle, ht, nbands);
    
    hi0mask = pointOp(log_rad,Yrcos,Xrcos[0],Xrcos[1]-Xrcos[0])
        
    return [hi0mask,lo0mask,bfilts_list,lfilts_list]

def buildSCFpyrLevs_Filt(XRES,YRES,log_rad,Xrcos,Yrcos,angle,ht,nbands):
    
    if ht <= 0:
        
        return [],[] #dummy list[] for bfilts_list and lfilts_list
    
    else:
        bfilts = np.zeros([nbands,XRES,YRES],"complex")

        #log rad = log_rad + 1
        Xrcos = Xrcos - 1 #shift origin of lut by 1 octave  
        lutsize = 1024
        Xcosn = np.pi * np.arange(-(2 * lutsize+1),(lutsize+2)) / lutsize
        order = nbands - 1 
        
        # divide by sqrt(sum_(n=0)^(N-1)) cos(pi*n/N)^(2(N-1))
        const = (2**(2*order)) * (math.factorial(order)**2)/(nbands * math.factorial(2*order))

        # Ycosn = sqrt(const) * (cos(Xcosn)).^order

        #analityc version: only take one lobe
        alfa = (np.pi + Xcosn)%(2*np.pi) - np.pi
        Ycosn =2*np.sqrt(const) * ( np.cos(Xcosn)**order ) * ( abs(alfa) < (np.pi/2) )
        himask = pointOp(log_rad,Yrcos,Xrcos[0],Xrcos[1]-Xrcos[0])

        for b in range(1,nbands+1):
            anglemask = pointOp(angle,Ycosn,Xcosn[0] + np.pi*(b-1)/nbands,Xcosn[1]-Xcosn[0])
            bfilts[b-1,:] = anglemask * himask# * ((-1j)**(nbands-1))
           
        dims = np.asarray([XRES,YRES],"float")
        ctr = np.ceil( (dims + 0.5)/2 ).astype("int")
        lodims = np.ceil( (dims - 0.5)/2 ).astype("int")
        loctr = np.ceil( (lodims + 0.5)/2 ).astype("int")
        lostart = ctr - loctr + 1
        loend = lostart + lodims-1

        log_rad = log_rad[lostart[0]-1:loend[0]-1+1,lostart[1]-1:loend[1]-1+1]
        angle = angle[lostart[0]-1:loend[0]-1+1,lostart[1]-1:loend[1]-1+1]
        YIrcos = abs(np.sqrt(1.0 - Yrcos**2))
        lomask = pointOp(log_rad,YIrcos,Xrcos[0],Xrcos[1]-Xrcos[0])
        XRES,YRES = int(XRES/2),int(YRES/2)
        
        bfilts_list ,lfilts_list = buildSCFpyrLevs_Filt(XRES,YRES,log_rad,Xrcos,Yrcos,angle,ht-1,nbands)

        bfilts_list.insert(0,bfilts)
        lfilts_list.insert(0,lomask)
        
        return bfilts_list,lfilts_list
