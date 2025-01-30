-- グレブナー基底を用いてナンプレを解くプログラム
-- 実行環境：https://www.unimelb-macaulay2.cloud.edu.au/#home
-- 参考：https://www.lab2.toho-u.ac.jp/sci/is/tsuchiya/teaching/Others/taiken.html

-- プログラム実行時間の計測を開始
startTime = cpuTime();

-- =====================================================
-- 環と変数を定義する
-- =====================================================
R = QQ[x_1..x_81];
X = gens R;  -- X は {x_1, x_2, ..., x_81} のリスト
-- i番目の変数は X_(i-1) と表される 

-- =====================================================
-- 各 x_i が1～9の値を取るようにする多項式 F_i を生成する
-- F_i = (x_i-1)(x_i-2)...(x_i-9) と定義する
-- =====================================================
F = for i in 1..81 list (
  (X_(i-1) - 1)*(X_(i-1) - 2)*(X_(i-1) - 3)*
  (X_(i-1) - 4)*(X_(i-1) - 5)*(X_(i-1) - 6)*
  (X_(i-1) - 7)*(X_(i-1) - 8)*(X_(i-1) - 9)
);

-- =====================================================
-- 関数 distinctPolynomial を定義 : 
-- (F_i, F_j, x_i, x_j) を使って、(F_i - F_j)/(x_i - x_j) を返す
-- =====================================================
distinctPolynomial = (f1, f2, x1, x2) -> (
    -- x_i - x_j が 0 でない前提の上で、 (F_i - F_j)/(x_i - x_j) を作る
    (f1 - f2) / (x1 - x2)
);

-- =====================================================
-- 関数 addDistinctConstraints(i, g) を定義：
-- ある i 番目のセルに対して「行・列・3×3ボックス」単位で、数字の重複を禁止する制約 (distinctPolynomial) を g に追加する
-- =====================================================
addDistinctConstraints = (i, g) -> (
    -- 行( row ) のインデックス:
    --   セルiが属する行は floor((i-1)/9) 行目なので、その行のセルは
    --   rowStart = 9 * floor((i-1)/9) + 1 から rowStart+8 まで
    --   ただし i と同じ位置は除外
    rowStart = 9 * floor((i-1)/9) + 1;
    rowInds  = for k in 0..8 list (rowStart + k);
    rowInds  = select(rowInds, j -> j != i);

    -- 列( column ) のインデックス:
    --   セルiが属する列は (i-1)%9 列目なので，
    --   colBase = ((i-1) % 9) + 1
    --   colInds = colBase + 9*k (k=0..8)
    --   ただし i と同じ位置は除外
    colBase  = ((i-1) % 9) + 1;
    colInds  = for k in 0..8 list (colBase + 9*k);
    colInds  = select(colInds, j -> j != i);

    -- ボックス( 3x3 ) のインデックス:
    --   セルiが属する 3x3 の左上がどこかを計算してから 3行3列ぶん列挙
    boxRowBlock = floor((i-1) / 27);       -- 3行ブロックのうちどれか(0～2)
    boxColBlock = floor(((i-1) % 9) / 3);  -- 3列ブロックのうちどれか(0～2)
    boxTopLeft  = 27*boxRowBlock + 3*boxColBlock + 1;
    boxInds = flatten for rr in 0..2 list (
               for cc in 0..2 list (boxTopLeft + 9*rr + cc)
              );
    boxInds = select(boxInds, j -> j != i);

    -- 3種類のインデックスをまとめて、(F_i - F_j)/(x_i - x_j) を生成して g に appendする
    allInds = rowInds | colInds | boxInds;  -- 行・列・ボックス全部まとめる
    f_i     = F#(i-1);
    x_i     = X#(i-1);

    for j in allInds do (
      -- 分母が 0 でないことを確認してから distinctPolynomial を実行
      if (x_i - X#(j-1)) != 0 then (
        g = append(g, lift(distinctPolynomial(f_i, F#(j-1), x_i, X#(j-1)), R))
      )
    );
    g
);

-- =====================================================
-- 実際に全セル i=1..81 に対して addDistinctConstraints を呼び出す
-- （同等の処理をループでまとめた）
-- =====================================================
g = {};
for i in 1..81 do (
  g = addDistinctConstraints(i, g);
);

-- =====================================================
-- ナンプレの初期値を設定する
-- =====================================================
g = append(g, x_2 - 3);
g = append(g, x_4 - 9);
g = append(g, x_6 - 5);

g = append(g, x_12 - 8);
g = append(g, x_14 - 7);
g = append(g, x_17 - 3);

g = append(g, x_19 - 6);
g = append(g, x_21 - 9);
g = append(g, x_24 - 4);
g = append(g, x_25 - 8);
g = append(g, x_27 - 7);

g = append(g, x_30 - 3);

g = append(g, x_38 - 8);
g = append(g, x_40 - 2);

g = append(g, x_46 - 5);
g = append(g, x_47 - 6);
g = append(g, x_48 - 2);
g = append(g, x_49 - 8);
g = append(g, x_51 - 3);
g = append(g, x_53 - 4);

g = append(g, x_66 - 6);
g = append(g, x_68 - 1);
g = append(g, x_69 - 7);
g = append(g, x_71 - 9);

g = append(g, x_73 - 9);
g = append(g, x_75 - 1);
g = append(g, x_79 - 2);
g = append(g, x_81 - 3);

-- =====================================================
-- イデアル I とグレブナー基底 G の生成
-- =====================================================
I = ideal(g);
G = gens gb I;
-- x_i = a という形の式が81個、グレブナー基底に現れる

-- =====================================================
-- ナンプレの結果表示
-- =====================================================
i = 1;
while i <= 9 do (
  A_i = "|";
  j = 1;
  while j <= 9 do (
    k = 9*(i-1) + j;
    s = toString(X#(k-1) - G_(0,81 - k));
    A_i = A_i | s;
    if (j % 3 == 0 and j < 9) then A_i = A_i | "|";
    j = j + 1;
  );
  A_i = A_i | "|";
  if i == 1 then A_1 = A_i;
  if i == 2 then A_2 = A_i;
  if i == 3 then A_3 = A_i;
  if i == 4 then A_4 = A_i;
  if i == 5 then A_5 = A_i;
  if i == 6 then A_6 = A_i;
  if i == 7 then A_7 = A_i;
  if i == 8 then A_8 = A_i;
  if i == 9 then A_9 = A_i;
  i = i + 1;
);

B = "|---+---+---|";
A = A_1 | "\n" | A_2 | "\n" | A_3 | "\n" |
    B   | "\n" | A_4 | "\n" | A_5 | "\n" | A_6 | "\n" |
    B   | "\n" | A_7 | "\n" | A_8 | "\n" | A_9;

print A;

-- プログラム実行時間の計測を終了
endTime = cpuTime();
runTime = endTime - startTime;
-- 計測結果を表示
print("Time (sec): " | toString(runTime));