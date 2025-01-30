function lie_bracket_plot(V, W)
% LIE_BRACKET_PLOT プロットの作成
%   LIE_BRACKET_PLOT(V, W) は、xy平面における2つのベクトル場VとWのリーブラケットをプロット。
%   VとWが指定されていない場合、デフォルトのベクトル場が使用。
%
%   入力:
%     V - ベクトル場を表す関数ハンドル。デフォルトは @(x, y) [0; y]
%     W - ベクトル場を表す関数ハンドル。デフォルトは @(x, y) [0; x]
%
%   例:
%     lie_bracket_plot(@(x, y) [y; x], @(x, y) [x^2; y^2]);

    if nargin < 2
        % デフォルトのベクトル場を設定
        V = @(x, y) [0; y];
        W = @(x, y) [0; x];
        disp('デフォルトのベクトル場 V = @(x, y) [0; y]; W = @(x, y) [0; x]; で計算');
    end

    % グリッドを設定
    x = linspace(-2, 2, 20);
    y = linspace(-2, 2, 20);
    [X, Y] = meshgrid(x, y);

    % リーブラケットの計算結果を格納する配列
    bracket_U = zeros(size(X));    % リーブラケットのx成分
    bracket_V = zeros(size(Y));    % リーブラケットのy成分
    W_U = zeros(size(X));          % ベクトル場Wのx成分
    W_V = zeros(size(Y));          % ベクトル場Wのy成分

    % グリッド上の各点でリーブラケットを計算
    for i = 1:size(X, 1)
        for j = 1:size(X, 2)
            % リーブラケット[V, W]を計算
            bracket = lie_bracket(V, W, X(i, j), Y(i, j));
            bracket_U(i, j) = bracket(1);    % リーブラケットのx成分を格納
            bracket_V(i, j) = bracket(2);    % リーブラケットのy成分を格納
            % ベクトル場Wの成分を格納
            w_vec = W(X(i, j), Y(i, j));
            W_U(i, j) = w_vec(1);            % Wのx成分
            W_V(i, j) = w_vec(2);            % Wのy成分

            % 計算結果をコンソールに出力
            printf('Point (x, y) = (%.2f, %.2f): Lie Bracket = (%.2f, %.2f)\n', X(i, j), Y(i, j), bracket(1), bracket(2));
        end
    end

    % プロットを作成
    figure;

    % ベクトル場Wを青色で描画
    quiver(X, Y, W_U, W_V, 'b', 'AutoScaleFactor', 1.5, 'LineWidth', 1, 'DisplayName', 'Vector Field W');
    hold on;

    % リーブラケット[V, W]を赤色で太く描画
    quiver(X, Y, bracket_U, bracket_V, 'r', 'AutoScaleFactor', 1.5, 'LineWidth', 2, 'DisplayName', 'Lie Bracket[V, W]');

    % タイトルとラベルのフォントサイズを設定
    title('Lie Bracket [V, W] and Vector Field W', 'FontSize', 20);
    xlabel('x', 'FontSize', 20);
    ylabel('y', 'FontSize', 20);

    % グリッドをオンにする
    grid on;

    % 凡例のフォントサイズを設定
    legend('FontSize', 16);

    hold off;
end

function bracket = lie_bracket(V, W, x, y)
% LIE_BRACKET 指定された点での2つのベクトル場のリーブラケットを計算
%   bracket = LIE_BRACKET(V, W, x, y) は、xy平面上の指定された点(x, y)での
%   2つのベクトル場VとWのリーブラケットを計算。
%   リーブラケットは[V, W] = VW - WVで与えられる
%   see https://showa-yojyo.github.io/notebook/tsuboi05/chapter8a.html AND https://mathworld.wolfram.com/Commutator.html
%
%   入力:
%     V - ベクトル場を表す関数ハンドル
%     W - ベクトル場を表す関数ハンドル
%     x - 点のx座標
%     y - 点のy座標
%
%   出力:
%     bracket - 指定された点(x, y)でのリーブラケット[V, W]を表す2要素のベクトル

    % 偏微分行列を数値的に計算する
    dV_dx = numerical_partial_derivative(V, x, y, 'x');
    dV_dy = numerical_partial_derivative(V, x, y, 'y');
    dW_dx = numerical_partial_derivative(W, x, y, 'x');
    dW_dy = numerical_partial_derivative(W, x, y, 'y');

    % ベクトル場VとWを評価
    V_vec = V(x, y);
    W_vec = W(x, y);

    % Vを使ったWの偏微分の計算
    V_dot_grad_W = dW_dx * V_vec(1) + dW_dy * V_vec(2);
    % Wを使ったVの偏微分の計算
    W_dot_grad_V = dV_dx * W_vec(1) + dV_dy * W_vec(2);

    % リーブラケット[V, W]を計算
    bracket = V_dot_grad_W - W_dot_grad_V;
end

function partial_deriv = numerical_partial_derivative(func, x, y, var)
% NUMERICAL_PARTIAL_DERIVATIVE ベクトル場の数値的な偏微分を計算します
%   指定された点(x, y)でのベクトル場の数値的な偏微分を、指定された変数(xまたはy)について計算。
%
%   入力:
%     func - ベクトル場を表す関数ハンドル
%     x - 点のx座標
%     y - 点のy座標
%     var - 偏微分を行う変数（'x' または 'y'）
%
%   出力:
%     partial_deriv - 指定された点(x, y)でのベクトル場の偏微分を表すベクトル

    h = 1e-5; % 微小量
    if strcmp(var, 'x')
        % xについての偏微分
        partial_deriv = (func(x + h, y) - func(x, y)) / h;
    elseif strcmp(var, 'y')
        % yについての偏微分
        partial_deriv = (func(x, y + h) - func(x, y)) / h;
    else
        error('Invalid variable for differentiation');
    end
end

