function plot_complex_transform()
  % 定義域の設定
  k = 10
  x = linspace(-1, 1, 400);
  y = linspace(0, 1, 400 * k);
  [X, Y] = meshgrid(x, y);
  Z = X + 1i * Y;

  % 条件 |z| < 1 並びに y > 0 を満たす点のフィルタリング
  mask = (abs(Z) < 1) & (imag(Z) > 0);
  Z = Z(mask);
  X = real(Z);
  Y = imag(Z);

  % 変換 w = -1/2 * (z + 1/z)
  W = -0.5 * (Z + 1 ./ Z);

  % wの実部と虚部を取得
  U = real(W);
  V = imag(W);

  % プロット
  figure;

  % z平面上の点をプロット
  subplot(1, 2, 1);
  plot(X, Y, 'bo', 'markersize', 1);
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

