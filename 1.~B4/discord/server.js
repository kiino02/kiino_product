/********************************************
 * モジュール読み込み・定数／変数宣言
 ********************************************/
const http = require('http');
const querystring = require('querystring');
const discord = require('discord.js');
const client = new discord.Client();

/**
 * members[0]: プレイヤー名の配列
 * members[1]: プレイヤーIDの配列
 */
let members = [[], []]; 

// 各種ゲーム管理用変数
let playerLives = [];         // プレイヤーのライフ（デフォルトなら3）
let totalSum = 0;             // 場のカード数値合計
let declaredValue = 0;        // 今宣言されている値
let deck = [
  '20', '15', '15', '10', '10', '10', '5', '5', '5', '5',
  '4', '4', '4', '4', '3', '3', '3', '3', '2', '2', '2',
  '2', '1', '1', '1', '1', '0', '0', '0', 'shuffleZero',
  '-5', '-5', '-10', 'double', 'maxToZero', 'blackbox'
];
const deckList = [
  '20', '15', '15', '10', '10', '10', '5', '5', '5', '5',
  '4', '4', '4', '4', '3', '3', '3', '3', '2', '2', '2',
  '2', '1', '1', '1', '1', '0', '0', '0', 'shuffleZero',
  '-5', '-5', '-10', 'double', 'maxToZero', 'blackbox'
];

/********************************************
 * シャッフル用関数
 ********************************************/
const shuffleArray = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

function arrayShuffle(array) {
  let k, t, len = array.length;
  if (len < 2) return array;
  while (len) {
    k = Math.floor(Math.random() * len--);
    t = array[k];
    array[k] = array[len];
    array[len] = t;
  }
  return array;
}

/********************************************
 * その他テスト／一時変数
 ********************************************/
let mapData;
let indexNum = -1;
let testArray = ['1','100', '55', 'UNKO'];
let testArray2 = [];
let testArray3 = [
  [1, 2, 3, 4, 5],
  [100, 200, 300, 400, 500]
];
let boxArray = [];
let tempArray = [];
let playerCards = [];  // プレイヤーが持っているカード
let discardPile = [];  // 墓地

/********************************************
 * ゲーム状態フラグ
 ********************************************/
let collectFlag = 0;      // 1なら参加募集開始
let joinFlag = 0;         // 1ならカード配り開始
let gameStartFlag = 0;    // 1ならゲーム開始
let shuffleFlag = 0;      // 1ならshuffleZeroを引いた
let doubleFlag = 0;       // 1ならdoubleを引いた
let maxToZeroFlag = 0;    // 1ならmaxToZeroを引いた
let continuousFlag = 0;   // 継続ラウンド用フラグ
let effectFlag = 0;       // 1なら効果カード発動があった
let replaceFlag = 0;
let secondFlag = 0;       // 1なら2週目以降

// カウンタ系・その他変数
let i = 0;
let j = 0;
let k = 0;
let gameMaster = 0;       // GM（ゲームマスター）のID
let turnCounter = 0;
let roundCounter = 0;
let playerOrder = [];     // ターンの順番 (playerOrder[0] = 名前配列, playerOrder[1] = ID配列)
let effects = [];         // 効果カードのみ格納
let numericalCards = [];  // 数値カードのみ格納
let largestValue = 0;     
let largestValue2 = 0;
let currentPlayer;
let previousPlayer;
let playerCount = 0;
let tempNumber = 0;

/********************************************
 * HTTPサーバ (Herokuなどの稼働維持用)
 ********************************************/
http.createServer(function(req, res) {
  if (req.method === 'POST') {
    let data = "";
    req.on('data', function(chunk) {
      data += chunk;
    });
    req.on('end', function() {
      if (!data) {
        console.log("No post data");
        res.end();
        return;
      }
      const dataObject = querystring.parse(data);
      console.log("post:" + dataObject.type);

      if (dataObject.type === "wake") {
        console.log("Woke up in post");
        res.end();
        return;
      }
      res.end();
    });
  } else if (req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Discord Bot is active now\n');
  }
}).listen(3000);

/********************************************
 * Discord Bot ログイン準備・起動時メッセージ
 ********************************************/
client.on('ready', () => {
  console.log('Bot準備完了～');
  client.user.setPresence({ activity: { name: 'コヨーテ' } });
});

/********************************************
 * メッセージ受信時の処理
 ********************************************/
client.on('message', message => {
  // Bot自身のメッセージは無視
  if (message.author.id === client.user.id) {
    return;
  }

  // Bot宛メンションの場合の応答
  if (message.isMemberMentioned(client.user)) {
    sendReply(message, "呼びましたか？");
    return;
  }

  /********************************************
   * テスト用コマンド
   ********************************************/
  if (message.content.match(/^test$/)) {
    sendMsg(message.channel.id, 'testArray.sum = ' 
      + testArray.reduce(function(a, x) { return a + ((x || 0) - 0); }, 0));
    sendMsg(message.channel.id, 'testArray2 = ' + testArray2);

    testArray2 = testArray.filter(function(value) {
      return isNaN(value) === false; // 数値のみ格納
    });

    largestValue = Math.max.apply(null, testArray2);
    sendMsg(message.channel.id, 'choose_testArray2 = ' + testArray2);
    sendMsg(message.channel.id, 'biggest_choose_testArray2 = ' + largestValue);
    return;
  }

  if (message.content.match(/^test3$/)) {
    testArray3 = [
      [1, 2, 3, 4, 5],
      [100, 200, 300, 400, 500]
    ];
    boxArray = [];
    tempArray = [];

    boxArray = testArray3[0];
    tempArray = testArray3[1];

    sendMsg(message.channel.id, 'boxArray= ' + boxArray);
    sendMsg(message.channel.id, 'tempArray= ' + tempArray);

    for (let i = boxArray.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [boxArray[i], boxArray[j]] = [boxArray[j], boxArray[i]];
      [tempArray[i], tempArray[j]] = [tempArray[j], tempArray[i]];
    }

    arrayShuffle(testArray3);
    mapData = new Map(testArray3);

    sendMsg(message.channel.id, 'boxArray= ' + boxArray);
    sendMsg(message.channel.id, 'tempArray = ' + tempArray);
    return;
  }

  if (message.content.match(/^sum$/)) {
    sendMsg(message.channel.id, 'totalSum = ' + totalSum);
    return;
  }

  if (message.content.match(/^rotation$/)) {
    sendMsg(message.channel.id, 'playerOrder = ' + playerOrder);
    return;
  }

  if (message.content.match(/^member$/)) {
    sendMsg(message.channel.id, 'members[0] = ' + members[0]);
    sendMsg(message.channel.id, 'members[1] = ' + members[1]);
    return;
  }

  if (message.content.match(/^flag$/)) {
    sendMsg(message.channel.id, 'members[0] = ' + members[0]);
    sendMsg(message.channel.id, 'members[1] = ' + members[1]);
    return;
  }

  /********************************************
   * ルール表示
   ********************************************/
  if (message.content.match(/^rule$/)) {
    sendMsg(message.channel.id, 'インディアンポーカーとチキンレースを足し合わせたようなゲームです');
    sendMsg(message.channel.id, 'このゲームは『場に出ている数字の合計値を予想する』ゲームですが、その一番の特徴は『自分の数字だけ見えない』ということです！\nつまり「相手の見えている数字」と「自分の見えない数字」があり、その合計の数を推理します。');
    sendMsg(message.channel.id, 'https://boku-boardgame.net/coyote');
    return;
  }

  /********************************************
   * リスト表示コマンド
   ********************************************/
  if (message.content.match(/^list$/)) {
    sendMsg(message.channel.id, 'カード（全36枚）\n```' + deckList + '```');
    sendMsg(message.channel.id, '墓地のカード\n```' + discardPile + '```');
    sendMsg(message.channel.id, '宣言されている値\n```' + declaredValue + '```');
    sendMsg(message.channel.id, 'プレイヤーのライフ（行動順に表示）');
    for (let i = 0; i < playerCount; i++) {
      sendMsg(message.channel.id, playerOrder[0][i] + ' 残りライフ: ' + playerLives[i]);
    }
    return;
  }

  /********************************************
   * ゲームを終了してリセット
   ********************************************/
  if (message.content.match(/^quit$/)) {
    sendMsg(message.channel.id, 'ゲームを終了します');

    // 各種変数初期化
    members = [[], []];
    indexNum = -1;
    testArray = ['1','100', '55', 'UNKO'];
    testArray2 = [];
    testArray3 = [
      [1, 2, 3, 4, 5],
      [100, 200, 300, 400, 500]
    ];
    boxArray = [];
    tempArray = [];
    playerCards = [];
    discardPile = [];
    collectFlag = 0;
    joinFlag = 0;
    gameStartFlag = 0;
    shuffleFlag = 0;
    doubleFlag = 0;
    maxToZeroFlag = 0;
    continuousFlag = 0;
    effectFlag = 0;
    replaceFlag = 0;
    secondFlag = 0;
    i = 0;
    j = 0;
    k = 0;
    gameMaster = 0;
    turnCounter = 0;
    roundCounter = 0;
    playerOrder = [];
    effects = [];
    numericalCards = [];
    largestValue = 0;
    largestValue2 = 0;
    currentPlayer = null;
    previousPlayer = null;
    playerCount = 0;
    tempNumber = 0;

    sendMsg(message.channel.id, 'もろもろの変数を初期化しました');
    return;
  }

  /********************************************
   * コヨーテ開始コマンド
   ********************************************/
  if (message.content.match(/^コヨーテ$/) && gameStartFlag === 0) {
    collectFlag = 1;
    sendMsg(message.channel.id, 'コヨーテを始めます\n参加する場合は join と入力してください\nルールを確認する場合は rule と入力してください\nゲームを終了する場合は quit と入力して下さい');
    return;
  }

  /********************************************
   * 参加コマンド
   ********************************************/
  if (
    message.content.match(/^join$/) &&
    collectFlag === 1 &&
    i < 10 &&
    members[1].some(newComer => newComer === message.author.id) === false
  ) {
    // 参加登録
    members[0][i] = message.author.username;
    members[1][i] = message.author.id;
    sendMsg(message.channel.id, '**' + members[0][i] + '** が参加しました');

    // 最初に参加したプレイヤーをGMに
    if (i === 0) {
      gameMaster = message.author.id;
      sendMsg(message.channel.id, '現在のGMは ```' + message.author.username + '``` です');
    }
    i++;

    // 2人以上いればスタート可能
    if (members[0].length === 2) {
      joinFlag = 1;
      sendMsg(message.channel.id, '参加可能な人数が揃いました。\n始めるにはGMは start と入力してください。\n引き続き参加するには join と入力してください。');
    }

    // 最大10人
    if (members[0].length === 10) {
      sendMsg(message.channel.id, '参加可能の最大人数です\nこれ以上のユーザは参加できません');
    }
  } else if (message.content.match(/^join$/) && collectFlag === 1 && i >= 10) {
    sendMsg(message.channel.id, 'ごめんね ' + message.author.username + '、このゲームは10人までなんだ');
  } else if (
    message.content.match(/^join$/) &&
    members[1].some(newComer => newComer === message.author.id) === true
  ) {
    // 二重登録防止
    sendMsg(message.channel.id, 'ん、 ' + message.author.username + ' はもう参加登録済みじゃないかな？');
  }

  /********************************************
   * ゲーム開始コマンド
   ********************************************/
  if (message.content.match(/^start$/) && joinFlag === 1 && message.author.id === gameMaster) {

    if (secondFlag === 0) {
      sendMsg(message.channel.id, 'members[0] = ' + members[0]);
      sendMsg(message.channel.id, 'members[1] = ' + members[1]);

      playerCards = Array(members[0].length).fill('');
      totalSum = 0;
      effectFlag = 0;
      continuousFlag = 0;

      if (continuousFlag === 0) {
        // 全員のライフを3にセット、デッキをシャッフル
        playerLives = Array(members[0].length).fill(3);
        deck = shuffleArray(deck);
      }

      // 順番決め (playerOrder[0]に名前, [1]にID)
      boxArray = members[0];
      tempArray = members[1];

      k = 100; // 一応ランダムの参考？(元コードのまま残す)
      j = Math.floor(Math.random() * (k + 1));
      sendMsg(message.channel.id, 'j = ' + j);

      // ランダムに順序変更(元コードではやや不思議な実装だが、動作は変えずにそのまま)
      for (k = 0; k < boxArray.length; k++) {
        j = k;
        while (j === k) {
          j = Math.floor(Math.random() * (boxArray.length + 1));
        }
        tempNumber = boxArray[k];
        boxArray[k] = boxArray[j];
        boxArray[j] = tempNumber;

        tempNumber = tempArray[k];
        tempArray[k] = tempArray[j];
        tempArray[j] = tempNumber;
      }

      if (continuousFlag === 0) {
        playerOrder.push(boxArray, tempArray);
      }
      playerCount = playerOrder[0].length;

      sendMsg(message.channel.id, 'playerOrder = ' + playerOrder);
      sendMsg(message.channel.id, 'playerCount = ' + playerCount);
    }

    // 各プレイヤーにカード配り
    for (i = 0; i < playerCount; i++) {
      playerCards[i] = deck[0]; 
      if (isNaN(parseInt(playerCards[i])) === false) {
        totalSum += parseInt(playerCards[i]);
      }
      deck.shift(); // 配ったカードをデッキ先頭から除去
    }

    sendMsg(message.channel.id, 'playerCards = ' + playerCards);

    // カード内容を他プレイヤーにだけDM送信
    for (i = 0; i < playerCount; i++) {
      for (j = 0; j < playerCount; j++) {
        if (i !== j) {
          client.users.get(playerOrder[1][i]).send(
            "**" + playerOrder[0][j] + '** の持っているカードは ' + playerCards[j] + ' です'
          );
          if (
            playerCards[j] === 'double'   ||
            playerCards[j] === 'maxToZero'||
            playerCards[j] === 'blackbox' ||
            playerCards[j] === 'shuffleZero'
          ) {
            if (playerCards[j] === 'double') {
              client.users.get(members[1][i]).send("効果：最後に場のカードの合計値を2倍にする");
            } else if (playerCards[j] === 'maxToZero') {
              client.users.get(members[1][i]).send("効果：最後に場のカードの最大値を0にする");
            } else if (playerCards[j] === 'blackbox') {
              client.users.get(members[1][i]).send("効果：最後にデッキからカードを1枚引いてそのカードの数値、効果を適用する");
            } else if (playerCards[j] === 'shuffleZero') {
              client.users.get(members[1][i]).send("効果：このカードは0として扱い、墓地に送られたら墓地のカードをデッキに全て戻します（デッキ切れ対策用）");
            }
          }
        }
      }
      client.users.get(members[1][i]).send('自分の持っているカードは自分ではわからないよ！');
    }

    if (secondFlag === 0) {
      turnCounter += 1;
      roundCounter += 1;
    }
    joinFlag = 0;
    gameStartFlag = 1;
    declaredValue = 0;

    sendMsg(message.channel.id, roundCounter + 'ラウンド目');
    sendMsg(message.channel.id, turnCounter + 'ターン目です');

    if (secondFlag === 0) {
      currentPlayer = playerOrder[0][(turnCounter - 1) % playerCount];
      sendMsg(message.channel.id, '順番は ```' + playerOrder[0] + '``` に決まりました');
    } else {
      previousPlayer = currentPlayer;
      currentPlayer = playerOrder[0][(turnCounter - 1) % playerCount];
    }

    sendMsg(message.channel.id, currentPlayer + ' は、raise(数字) で場の数の合計値以上にならないように数字を宣言してください');
  }

  /********************************************
   * 宣言（レイズ）コマンド
   ********************************************/
  if (
    message.content.slice(0, 5) === 'raise' &&
    playerOrder[0][(turnCounter - 1) % playerCount] === message.author.username &&
    gameStartFlag === 1
  ) {
    if (isNaN(message.content.slice(5)) === false) {
      if (message.content.slice(5) <= declaredValue) {
        sendMsg(
          message.channel.id,
          '宣言されている値よりも大きな数字を宣言してね！今の宣言値は ' + declaredValue + 'です'
        );
      } else if (message.content.slice(5) >= 1000) {
        sendMsg(
          message.channel.id,
          '宣言できる最大値は999だよ！今の宣言値は ' + declaredValue + 'です'
        );
      } else {
        sendMsg(
          message.channel.id,
          '**' + currentPlayer + '** は、```' + message.content.slice(5) + '```を宣言しました'
        );
        turnCounter += 1;
        previousPlayer = currentPlayer;
        currentPlayer = playerOrder[0][(turnCounter - 1) % playerCount];
        declaredValue = parseInt(message.content.slice(5));

        // 次の手番
        sendMsg(message.channel.id, turnCounter + 'ターン目です');
        sendMsg(
          message.channel.id,
          currentPlayer + ' は、raise(数字) で場の数の合計値以上にならないように数字を宣言するか、コヨーテ と宣言して合計値の答え合わせをしてください'
        );
      }
    } else {
      sendMsg(message.channel.id, 'raise の後は数字を入力してね！');
    }
  } else if (
    currentPlayer !== message.author.username &&
    gameStartFlag === 1 &&
    turnCounter >= 1 &&
    message.content.slice(0, 5) === 'raise'
  ) {
    // 順番以外の人がraiseした時
    sendMsg(
      message.channel.id,
      '**' + message.author.username + '** 、順番を守って楽しくゲームをしようね！'
    );
  }

  /********************************************
   * コヨーテ(答え合わせ)コマンド
   ********************************************/
  if (
    (message.content.match(/^koyo-te$/) || message.content.match(/^コヨーテ$/)) &&
    gameStartFlag === 1 &&
    turnCounter >= 2
  ) {
    sendMsg(
      message.channel.id,
      'コヨーテ！** ' + currentPlayer + ' **は** ' + previousPlayer 
      + ' **の宣言は場に出ているカードの合計値よりも大きいと予想しました'
    );
    sendMsg(message.channel.id, '皆のカードを表示します');
    sendMsg(message.channel.id, '```' + playerCards + '```');

    // 効果カードのみ抽出
    effects = playerCards.filter(function(value) {
      return isNaN(value) === true; // 数字以外(効果カード)
    });

    for (i = 0; i < effects.length; i++) {
      largestValue = Math.max.apply(null, numericalCards);
      largestValue2 = 0;

      if (effects[i] === 'double') {
        sendMsg(
          message.channel.id,
          '**' + playerOrder[0][playerCards.indexOf('double')] + '** のdoubleカードが発動！場のカードの合計値が2倍になります！'
        );
        sendMsg(message.channel.id, '```合計値：' + totalSum + '→' + 2 * totalSum + '```');
        totalSum = 2 * totalSum;
        doubleFlag = 1;
        effectFlag = 1;

      } else if (effects[i] === 'maxToZero') {
        sendMsg(
          message.channel.id,
          '**' + playerOrder[0][playerCards.indexOf('maxToZero')] 
          + '** のmaxToZeroカードが発動！現時点での場のカードの最大値が0になります！'
        );

        // 数値のみ抽出
        numericalCards = playerCards.filter(function(value) {
          return isNaN(value) === false;
        });

        largestValue = Math.max.apply(null, numericalCards); // int
        largestValue2 = largestValue;

        // 最大値を文字列→0に置換
        playerCards[playerCards.indexOf(String(largestValue))] = 0;
        numericalCards[numericalCards.indexOf(String(largestValue))] = 0;

        maxToZeroFlag = 1;
        let newSum = numericalCards.reduce((acc, x) => acc += parseInt(x), 0);
        if (doubleFlag === 1) newSum *= 2;

        sendMsg(message.channel.id, '```合計値：' + totalSum + '→' + newSum + '```');
        totalSum = newSum;
        replaceFlag = 1;
        effectFlag = 1;

      } else if (effects[i] === 'blackbox') {
        sendMsg(
          message.channel.id,
          '**' + playerOrder[0][playerCards.indexOf('blackbox')] 
          + '** のblackboxカードが発動！デッキからカードを一枚引きます'
        );

        while (isNaN(effects[i]) === true) {
          discardPile.push(effects[i]);
          effects[i] = deck[0];
          deck.shift();
          sendMsg(message.channel.id, 'デッキから引いたカードは' + effects[i] + 'です');

          if (isNaN(effects[i]) === false) {
            sendMsg(
              message.channel.id,
              'blackboxカードは ```' + effects[i] + '```になりました'
            );
            // 手持ちのblackboxを新カードに置き換え
            playerCards[playerCards.indexOf('blackbox')] = effects[i];
          } else {
            sendMsg(
              message.channel.id,
              '数字カードではないためもう一度引きます'
            );
          }
        }

        numericalCards = playerCards.filter(function(value) {
          return isNaN(value) === false;
        });

        // maxToZeroが既に発動していた場合の処理
        if (maxToZeroFlag === 1) {
          if (effects[i] > largestValue) {
            // 新たに引いたカードが最大値だった場合、そのカードを0にして元の最大値を戻す
            playerCards[playerCards.indexOf(effects[i])] = 0;
            numericalCards[playerCards.indexOf(effects[i])] = 0;
            effects[i] = 0;

            // 0になっている（本来の最大値）を戻す
            playerCards[playerCards.indexOf(0)] = largestValue;
            numericalCards[numericalCards.indexOf(0)] = largestValue;
          }
        }

        let newSum = numericalCards.reduce(function(acc, x) {
          return acc + ((x || 0) - 0);
        }, 0);

        if (doubleFlag === 1) {
          newSum = 2 * newSum;
        }

        sendMsg(message.channel.id, '```合計値：' + totalSum + '→' + newSum + '```');
        totalSum = newSum;
        effectFlag = 1;

      } else if (effects[i] === 'shuffleZero') {
        sendMsg(
          message.channel.id,
          '**' + playerOrder[0][playerCards.indexOf('shuffleZero')] 
          + '** のshuffleZeroカードが発動！このラウンド終了時にすべてのカードをデッキに戻します'
        );
        shuffleFlag = 1;
        playerCards[playerCards.indexOf('shuffleZero')] = 0;
        effects[i] = 0;

        numericalCards = playerCards.filter(function(value) {
          return isNaN(value) === false;
        });

        totalSum = numericalCards.reduce(function(acc, x) {
          return acc + ((x || 0) - 0);
        }, 0);

        sendMsg(message.channel.id, '```合計値：' + totalSum + '```');
        effectFlag = 1;
      }
    }

    // 効果カード発動がなければそのまま合計値表示
    if (effectFlag === 0) {
      sendMsg(message.channel.id, '```合計値：' + totalSum + '```');
    }

    // 宣言値(declaredValue)と合計値(totalSum)の比較
    if (declaredValue <= totalSum) {
      // 宣言値が合計値以下 → 宣言した人(currentPlayer)が負け
      playerLives[(turnCounter - 1) % playerCount] -= 1;
      sendMsg(
        message.channel.id,
        '宣言した値は場のカードの合計以下なので** ' + currentPlayer + '**の負け！'
      );
      sendMsg(
        message.channel.id,
        currentPlayer + 'のライフが減ります\n残りライフ：' 
        + playerLives[(turnCounter - 1) % playerCount]
      );
    } else {
      // 合計値より宣言値が大きい → 前の人(previousPlayer)が負け
      playerLives[(turnCounter - 2) % playerCount] -= 1;
      sendMsg(
        message.channel.id,
        '宣言した値は場のカードの合計より大きいので** ' + previousPlayer + '**の負け！'
      );
      sendMsg(
        message.channel.id,
        previousPlayer + 'のライフが減ります\n残りライフ：'
        + playerLives[(turnCounter - 2) % playerCount]
      );
    }

    // maxToZeroの一時置き換え解除
    if (replaceFlag === 1) {
      replaceFlag = 0;
      playerCards[playerCards.indexOf(0)] = largestValue2;
      largestValue2 = 0;
    }

    // 使用済みカードを墓地に送る
    for (i = 0; i < playerCards.length; i++) {
      discardPile.push(playerCards[i]);
    }
    playerCards = [];

    // shuffleZeroが発動した場合、デッキを初期化して再度シャッフル
    if (shuffleFlag === 1) {
      shuffleFlag = 0;
      discardPile = [];
      deck = [
        '20', '15', '15', '10', '10', '10', '5', '5', '5', '5',
        '4', '4', '4', '4', '3', '3', '3', '3', '2', '2', '2',
        '2', '1', '1', '1', '1', '0', '0', '0', 'shuffleZero',
        '-5', '-5', '-10', 'double', 'maxToZero', 'blackbox'
      ];
      deck = shuffleArray(deck);
      doubleFlag = 0;
      maxToZeroFlag = 0;
      continuousFlag = 0;
      effectFlag = 0;
    }

    // コヨーテ後のターン・ラウンド管理
    turnCounter += 1;
    previousPlayer = currentPlayer;
    currentPlayer = playerOrder[0][(turnCounter - 1) % playerCount];
    secondFlag = 1;

    // ライフが0のプレイヤーがいればゲーム終了
    if (playerLives.some(value => value === 0)) {
      sendMsg(
        message.channel.id,
        '**' + playerOrder[0][playerLives.indexOf(0)] + '** のライフが0になりました！\nゲームを終了します\nquit を入力してください'
      );
    } else {
      // 次ラウンド開始待ち
      joinFlag = 1;
      continuousFlag = 1;
      sendMsg(message.channel.id, '次のラウンドを始めます。start を入力してください');
      sendMsg(message.channel.id, 'やめる場合は quit を入力してください');
    }
  }
});

/********************************************
 * トークンチェック＆ログイン
 ********************************************/
if (process.env.DISCORD_BOT_TOKEN == undefined) {
  console.log('DISCORD_BOT_TOKENが設定されていません。');
  process.exit(0);
}
client.login(process.env.DISCORD_BOT_TOKEN);

/********************************************
 * メッセージ送信用の補助関数
 ********************************************/
function sendReply(message, text) {
  message.reply(text)
    .then(() => console.log("リプライ送信: " + text))
    .catch(console.error);
}

function sendMsg(channelId, text, option = {}) {
  client.channels.get(channelId).send(text, option)
    .then(() => console.log("メッセージ送信: " + text + JSON.stringify(option)))
    .catch(console.error);
}
