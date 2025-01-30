function plot_complex_tan_transform()
  % 定義域の設定
  x = linspace(-pi/2, pi/2, 400);
  x = x(2:end-1);  % -pi/2 と pi/2 を除外
  y = linspace(0, 10, 800 * 5);
  [X, Y] = meshgrid(x, y);
  Z = X + 1i * Y;

  % 変換 w = tan(z)
  W = tan(Z);

  % wの実部と虚部を取得
  U = real(W);
  V = imag(W);

  % 条件 v > 0 を満たす点のフィルタリング
  %mask = V > 0;
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

