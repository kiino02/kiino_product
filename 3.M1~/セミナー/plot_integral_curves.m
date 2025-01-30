function plot_integral_curves(vector_field)
    % plot_integral_curves - 座標平面上に積分曲線を描画する関数
    %
    % 指定されたベクトル場に基づいて座標平面上に積分曲線を描画する。
    % ベクトル場が指定されない場合、デフォルトのベクトル場 (t, x) [x(1); -x(2)] を使用する。
    %
    % 引数:
    %   vector_field (function handle) - ベクトル場を定義する関数ハンドル。形式は以下の通り:
    %     @(t, x) [x(1); -x(2)]
    %   この場合、t は時間、x は2次元ベクトル (x(1), x(2)) である
    %
    % 使用例:
    %   plot_integral_curves();  % デフォルトのベクトル場を使用
    %   plot_integral_curves(@(t, x) [-x(2); x(1)]);  % 回転ベクトル場を使用
    %   plot_integral_curves(@(t, x) [x(1); x(2)]);  % ベクトル場 X = x∂_x + y∂_y を使用
    %   plot_integral_curves(@(t, x) [x(1); x(1)]);  % ベクトル場 X = x∂_x + x∂_y を使用
    %   plot_integral_curves(@(t, x) [x(1) + x(2); 2]);  % ベクトル場 X = (x + y)∂_x + 2∂_y を使用
    %
    % 出力:
    %   座標平面上にベクトル場と積分曲線をプロットする図を生成

    % デフォルトのベクトル場
    if nargin < 1
        vector_field = @(t, x) [x(1); -x(2)];
    end

    % 描画領域の設定
    figure;
    hold on;
    axis equal;
    grid on;

    % 初期条件の設定（5個の異なる初期条件を設定）
    initial_conditions = [
        -2, 2;
        2, -2;
        0, 2;
        2, 0;
        -2, -2;
    ];

    % 積分曲線の描画
    for i = 1:size(initial_conditions, 1)
        [t, x] = ode45(vector_field, [0, 3], initial_conditions(i, :)); % 積分時間 = 3
        plot(x(:, 1), x(:, 2), 'DisplayName', ['Initial: [', num2str(initial_conditions(i, :)), ']'], 'LineWidth', 2); % 太さを2に設定
    end

    % ベクトル場の描画
    [X, Y] = meshgrid(-3:0.5:3, -3:0.5:3);
    U = zeros(size(X));
    V = zeros(size(Y));
    for i = 1:numel(X)
        vec = vector_field(0, [X(i); Y(i)]);
        U(i) = vec(1);
        V(i) = vec(2);
    end

    % ベクトル場の関数ハンドルを文字列に変換
    vector_field_str = func2str(vector_field);
    quiver(X, Y, U, V, 'k', 'DisplayName', [vector_field_str]);

    % プロット範囲の設定
    axis([-3 3 -3 3]); % X軸とY軸の範囲を制限

    title('Integral Curves and Vector Field', 'FontSize', 30);
    xlabel('x', 'FontSize', 30);
    ylabel('y', 'FontSize', 30);
    % グラフの目盛りの文字サイズを設定
    set(gca, 'FontSize', 18);
    legend('show');
    hold off;
end

% メイン関数の呼び出し例
plot_integral_curves(@(t, x) [x(1); -x(2)]);

