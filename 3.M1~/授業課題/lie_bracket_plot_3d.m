function lie_bracket_plot_3d(V, W)
    if nargin < 2
        % デフォルトのベクトル場を設定
        V = @(x, y, z) [x; y; z];
        W = @(x, y, z) [z; y; x];
        disp('デフォルトのベクトル場 V = @(x, y, z) [x; y; z]; W = @(x, y, z) [z; y; x]; で計算');
    end

    % グリッドを設定
    x = linspace(-2, 2, 10);
    y = linspace(-2, 2, 10);
    z = linspace(-2, 2, 10);
    [X, Y, Z] = meshgrid(x, y, z);

    % リーブラケットの計算結果を格納する配列
    bracket_U = zeros(size(X));    % リーブラケットのx成分
    bracket_V = zeros(size(Y));    % リーブラケットのy成分
    bracket_W = zeros(size(Z));    % リーブラケットのz成分
    W_U = zeros(size(X));          % ベクトル場Wのx成分
    W_V = zeros(size(Y));          % ベクトル場Wのy成分
    W_W = zeros(size(Z));          % ベクトル場Wのz成分

    % グリッド上の各点でリーブラケットを計算
    for i = 1:size(X, 1)
        for j = 1:size(X, 2)
            for k = 1:size(X, 3)
                % リーブラケット[V, W]を計算
                bracket = lie_bracket_3d(V, W, X(i, j, k), Y(i, j, k), Z(i, j, k));
                bracket_U(i, j, k) = bracket(1);    % リーブラケットのx成分を格納
                bracket_V(i, j, k) = bracket(2);    % リーブラケットのy成分を格納
                bracket_W(i, j, k) = bracket(3);    % リーブラケットのz成分を格納
                % ベクトル場Wの成分を格納
                w_vec = W(X(i, j, k), Y(i, j, k), Z(i, j, k));
                W_U(i, j, k) = w_vec(1);            % Wのx成分
                W_V(i, j, k) = w_vec(2);            % Wのy成分
                W_W(i, j, k) = w_vec(3);            % Wのz成分

                % 計算結果をコンソールに出力
                printf('Point (x, y, z) = (%.2f, %.2f, %.2f): Lie Bracket = (%.5f, %.5f, %.5f)\n', ...
                        X(i, j, k), Y(i, j, k), Z(i, j, k), bracket(1), bracket(2), bracket(3));
            end
        end
    end

    % プロットを作成
    figure;

    % ベクトル場Wを青色で描画
    quiver3(X, Y, Z, W_U, W_V, W_W, 'b', 'AutoScaleFactor', 1.5, 'LineWidth', 1, 'DisplayName', 'Vector Field W');
    hold on;

    % リーブラケット[V, W]を赤色で太く描画
    quiver3(X, Y, Z, bracket_U, bracket_V, bracket_W, 'r', 'AutoScaleFactor', 1.5, 'LineWidth', 2, 'DisplayName', 'Lie Bracket[V, W]');

    % タイトルとラベルのフォントサイズを設定
    title('Lie Bracket [V, W] and Vector Field W', 'FontSize', 20);
    xlabel('x', 'FontSize', 20);
    ylabel('y', 'FontSize', 20);
    zlabel('z', 'FontSize', 20);

    % グリッドをオンにする
    grid on;

    % 凡例のフォントサイズを設定
    legend('FontSize', 16);

    hold off;
end

% リーブラケットの計算を行う関数
function bracket = lie_bracket_3d(V, W, x, y, z)
    % 偏微分行列を数値的に計算する
    dV_dx = numerical_partial_derivative_3d(V, x, y, z, 'x');
    dV_dy = numerical_partial_derivative_3d(V, x, y, z, 'y');
    dV_dz = numerical_partial_derivative_3d(V, x, y, z, 'z');
    dW_dx = numerical_partial_derivative_3d(W, x, y, z, 'x');
    dW_dy = numerical_partial_derivative_3d(W, x, y, z, 'y');
    dW_dz = numerical_partial_derivative_3d(W, x, y, z, 'z');

    % ベクトル場VとWを評価
    V_vec = V(x, y, z);
    W_vec = W(x, y, z);

    % Vを使ったWの偏微分の計算
    V_dot_grad_W = dW_dx * V_vec(1) + dW_dy * V_vec(2) + dW_dz * V_vec(3);
    % Wを使ったVの偏微分の計算
    W_dot_grad_V = dV_dx * W_vec(1) + dV_dy * W_vec(2) + dV_dz * W_vec(3);

    % リーブラケット[V, W]を計算
    bracket = V_dot_grad_W - W_dot_grad_V;
end

% 数値的に偏微分を計算する関数
function partial_deriv = numerical_partial_derivative_3d(func, x, y, z, var)
    h = 1e-5; % 微小量
    if strcmp(var, 'x')
        % xについての偏微分
        partial_deriv = (func(x + h, y, z) - func(x, y, z)) / h;
    elseif strcmp(var, 'y')
        % yについての偏微分
        partial_deriv = (func(x, y + h, z) - func(x, y, z)) / h;
    elseif strcmp(var, 'z')
        % zについての偏微分
        partial_deriv = (func(x, y, z + h) - func(x, y, z)) / h;
    else
        error('Invalid variable for differentiation');
    end
end

