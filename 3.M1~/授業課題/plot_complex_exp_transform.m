function plot_complex_exp_transform()
  % 定義域の設定
  x = linspace(-pi/2, pi/2, 500);
  y = linspace(0, 5, 500);
  [X, Y] = meshgrid(x, y);
  Z = X + 1i * Y;

  % 変換 w = exp(i * z)
  W = exp(1i * Z);

  % wの実部と虚部を取得
  U = real(W);
  V = imag(W);

  % 条件 |w| < 1 並びに u > 0 を満たす点のフィルタリング
  %mask = (abs(W) < 1) & (real(W) > 0);
  %U = U(mask);
  %V = V(mask);

  % プロット
  figure;

  % z平面上の点をプロット
  subplot(1, 2, 1);
  plot(real(Z(:)), imag(Z(:)), 'bo', 'markersize', 1);
  title('z-plane');
  xlabel('Re(z)');
  ylabel('Im(z)');
  grid on;

  % w平面上の点をプロット
  subplot(1, 2, 2);
  plot(U, V, 'ro', 'markersize', 1);
  title('w-plane');
  xlabel('Re(w)');
  ylabel('Im(w)');
  grid on;

  % レイアウトの調整
  set(gcf, 'Position', [100, 100, 1200, 500]);
end

