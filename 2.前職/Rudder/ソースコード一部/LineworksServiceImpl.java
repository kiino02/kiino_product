// !! import部分を省略しています !!

@Service
public class LineworksServiceImpl extends AbstractService implements LineworksService {

  /** 勤務場所の登録を行うサービスクラス */
  @Autowired private SeatStatusRegisterService seatStatusRegisterService;

  /** LINEWORKS上で用いるbotId */
  @Value("${lineworks.bot.id}")
  private String botId;

  /** LINEWORKSのapplinkのURI */
  @Value("${lineworks.app.link.uri}")
  private String appLinkUri;

  /** LINEWORKS ID変換コンポーネント */
  @Autowired private LineworksIdConversionComponent lineworksIdConversionComponent;

  /** LINEWORKSコンポーネント */
  @Autowired private LineworksComponent lineworksComponent;

  /** 就業可能フロア数取得マッパー */
  @Autowired private QRD005013Mapper qRD005013Mapper;

  /** 座席ID取得マッパー */
  @Autowired private QRD005010Mapper qRD005010Mapper;

  /** フロアリスト取得マッパー */
  @Autowired private QRD005011Mapper qRD005011Mapper;

  /** フロア名取得マッパー */
  @Autowired private QRD007009Mapper qRD007009Mapper;

  /** フロアID取得マッパー */
  @Autowired private QRD007010Mapper qRD007010Mapper;

  /** 就業場所テーブルマッパー */
  @Autowired private TblWorkspaceMapper tblWorkspaceMapper;

  /** 設定マスタ挿入・更新マッパー */
  @Autowired private QRD023002Mapper qRD023002Mapper;

  /** ユーザー検索マッパー */
  @Autowired private QRM003011Mapper qRM003011Mapper;

  /** 従業員着席情報テーブルマッパー */
  @Autowired private TblEmployeeSeatingInfoMapper tblEmployeeSeatingInfoMapper;

  /** 固定席テーブルマッパー */
  @Autowired private TblFixedSeatMapper tblFixedSeatMapper;

  /** 座席マスタマッパー */
  @Autowired private MstSeatMapper mstSeatMapper;

  /** 設定マスタマッパー */
  @Autowired private MstConfigMapper mstConfigMapper;

  /** 4:30に離席バッチが起動するため、退勤判定（leave_dateのnot null）を当日の5時以降とする。 */
  private static final LocalTime LEAVE_SEAT_BASE_TIME = LocalTime.of(5, 0);

  // !! 定数宣言部分を省略しています !!

  // 出勤処理///////////////////////////////////////////////////////////

  /** {@inheritDoc} */
  public List<LwFlexTemplateMainContents> runStartingMenu(@NonNull String userId) {
    boolean hasFixedSeat = true;
    Integer fixedSeatId = null;
    try {
      // /******************************************************/
      // ユーザーが固定席を所持しているかを判断する。
      // /******************************************************/
      TblFixedSeat tblFixedSeat = tblFixedSeatMapper.selectByPrimaryKey(userId);

      if (tblFixedSeat == null) {
        hasFixedSeat = false;
      } else {
        fixedSeatId = tblFixedSeat.getSeatId();
      }

    } catch (DataAccessException e) {
      logger.error(MessageCd.R_SD_0031_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SD_0002_E);
    } catch (Exception e) {
      logger.error(MessageCd.R_SA_0037_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SQ_0010_E);
    }

    if (hasFixedSeat) {
      // 固定席を持っている場合、出勤メニュー押下した段階で従業員着席情報テーブルへの挿入および打刻を行う
      runStartingTimeProcess(userId, fixedSeatId);

      // 打刻だけ行い、フレキシブルテンプレートは返さない
      return null;
    } else {
      // 固定席が無い場合、出社先フロア一覧取得 を実行（客先外出、在宅勤務、自社フロア一覧）
      return getFloorList(userId, START_WORK, MessageCd.R_SA_0038_I);
    }
  }

  /** {@inheritDoc} */
  public void runStartingTimeProcess(@NonNull String userId, @NonNull Integer seatId) {

    try {
      Pair<Boolean, String> registerResult = seatStatusRegisterService.register(seatId, userId);
      if (!registerResult.getLeft()) {
        // 出勤時間打刻失敗の場合はLINEWORKSに表示するためのエラーメッセージ返す
        throw new BusinessLogicException(MessageCd.R_SA_0071_E, registerResult.getRight());
      }

    } catch (RestClientException | JsonProcessingException | ConnectionException e) {
      /** Salesforce共通部品呼び出し時のエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SA_0008_E);
    } catch (DataIntegrityViolationException | UncategorizedSQLException e) {
      /** 外部制約エラー、桁あふれ時にエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SQ_0001_E);
    } catch (DataAccessException e) {
      throw new BusinessLogicException(e, MessageCd.N_SD_0002_E);
    } catch (BusinessLogicException e) {
      throw e;
    } catch (Exception e) {
      // 呼び出し元でException発生時のloggerを実行しないため、ここで実行
      logger.error(MessageCd.R_SA_0037_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SQ_0010_E);
    }
  }

  /////////////////////////////////////////////////////////////

  // 退勤処理///////////////////////////////////////////////////////////

  /** {@inheritDoc} */
  public void runLeavingMenu(@NonNull String userId) {

    try {
      Pair<Boolean, String> leaveResult = seatStatusRegisterService.leaveWork(userId);
      if (!leaveResult.getLeft()) {
        // 退勤時間打刻失敗の場合はLINEWORKSに表示するためのエラーメッセージ
        throw new BusinessLogicException(MessageCd.R_SA_0071_E, leaveResult.getRight());
      }
    } catch (RestClientException | JsonProcessingException | ConnectionException e) {
      /** Salesforce共通部品呼び出し時のエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SA_0008_E);
    } catch (DataIntegrityViolationException | UncategorizedSQLException e) {
      /** 外部制約エラー、桁あふれ時にエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SQ_0001_E);
    } catch (DataAccessException e) {
      throw new BusinessLogicException(e, MessageCd.N_SD_0002_E);
    } catch (BusinessLogicException e) {
      throw e;
    } catch (Exception e) {
      // 呼び出し元でException発生時のloggerを実行しないため、ここで実行
      logger.error(MessageCd.R_SA_0037_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SQ_0010_E);
    }
  }

  /////////////////////////////////////////////////////////////

  // 座席移動処理///////////////////////////////////////////////////////////

  /** {@inheritDoc} */
  public List<LwFlexTemplateMainContents> runMovingMenu(@NonNull String userId) {

    try {
      // 引数のユーザーが出勤済み（従業員着席情報テーブルに存在するかどうか）か確認
      if (!isWorking(userId)) {
        // 出勤していない場合は、座席移動先の選択ではなく、出勤先を選択するフレキシブルテンプレートを作成
        return runStartingMenu(userId);
      } else {
        // 座席移動出勤先を選択するフレキシブルテンプレートを作成
        return getFloorList(userId, JobPostbackEnum.MOVE.getLabel(), MessageCd.R_SA_0035_I);
      }

      // 呼び出し先で例外はすべてBusinessLogicException にまとめられる。
    } catch (BusinessLogicException e) {
      throw e;
    }
  }

  /** {@inheritDoc} */
  public void runMovingProcess(@NonNull String userId, @NonNull Integer seatId) {

    try {
      // 呼び出し先でトランザクションのコミット、ロールバックが実行されている
      // その日2回目以降の register は false 返さない
      seatStatusRegisterService.register(seatId, userId);

    } catch (RestClientException | JsonProcessingException | ConnectionException e) {
      /** Salesforce共通部品呼び出し時のエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SA_0008_E);
    } catch (DataIntegrityViolationException | UncategorizedSQLException e) {
      /** 外部制約エラー、桁あふれ時にエラーをキャッチ */
      throw new BusinessLogicException(e, MessageCd.R_SQ_0001_E);
    } catch (DataAccessException e) {
      throw new BusinessLogicException(e, MessageCd.N_SD_0002_E);
    } catch (BusinessLogicException e) {
      throw e;
    } catch (Exception e) {
      // 呼び出し元でException発生時のloggerを実行しないため、ここで実行
      logger.error(MessageCd.R_SA_0037_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SQ_0010_E);
    }
  }

  /////////////////////////////////////////////////////////////

  // いつもの席設定処理///////////////////////////////////////////////////////////

  /** {@inheritDoc} */
  public List<LwFlexTemplateMainContents> runSettingMenu(@NonNull String userId) {
    // フレキシブルテンプレートの宣言
    List<LwFlexTemplateMainContents> contentsList = new LinkedList<>();

    // フレキシブルテンプレートの生成
    // 表示メッセージの生成
    String titleText = SETTING_MESSAGE;
    setTitleText(contentsList, titleText);

    // 「いつも座る席設定」ボタンを配置
    setButton(contentsList, SETTING_FIXEDSEAT, JobPostbackEnum.SETTING_FIXEDSEAT.getLabel());

    // 「朝の予定表示」ボタンを配置
    setButton(contentsList, DISPLAY_TASK, JobPostbackEnum.DISPLAY_TASK.getLabel());

    return contentsList;
  }

  // !! いつもの席設定処理を中略しています !!

  /** {@inheritDoc} */
  public LwFlexTemplateCarouselContent searchUserName(
      @NonNull String userId, @NonNull String userName, @NonNull String postback) {

    List<QRM003011> userList;

    // ポストバック内容を.ごとに配列で取得
    String[] postbackSplitArray = postback.split("[.]");
    String postbackId = postbackSplitArray[postbackSplitArray.length - 1];

    // ポストバック値の "PAGE"より後の文字列部分取得
    String strNextPageNumber = postbackId.replace(JobPostbackEnum.PAGE.getLabel(), "");

    // 次に表示させるページ番号の初期化
    int nextPageNumber = 1;

    try {
      nextPageNumber = Integer.parseInt(strNextPageNumber);
    } catch (NumberFormatException e) {
      // "PAGE" より後が数字ではない場合、異常処理として業務例外をスロー
      logger.error(MessageCd.R_SA_0042_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.R_SQ_0001_E);
    }

    try {
      // 4:30に離席バッチが起動するため、退勤判定（leave_dateのnot null）を当日の5時以降とする。
      userList =
          qRM003011Mapper.selectMstUser(
              userName, LocalDateTime.of(LocalDate.now(), LEAVE_SEAT_BASE_TIME));
      if (userList.size() == 0) {
        throw new BusinessLogicException(MessageCd.R_SA_0058_I);
      }
    } catch (DataAccessException e) {
      logger.error(MessageCd.R_SD_0031_E, e, userId);
      throw new BusinessLogicException(e, MessageCd.N_SD_0002_E);
    }

    LwFlexTemplateCarouselContents lwFlexTemplateCarouselContents =
        LwFlexTemplateCarouselContents.builder()
            .type(ContentTypeEnum.carousel)
            .contents(new ArrayList<>())
            .build();
    int range =
        userList.size() < (nextPageNumber * DISPLAYABLE_MAX_NUM)
            ? userList.size()
            : (nextPageNumber * DISPLAYABLE_MAX_NUM);

    for (int i = (nextPageNumber - 1) * DISPLAYABLE_MAX_NUM; i < range; i++) {
      // ユーザー名のコンテント
      LwFlexTemplateCarouselContents userNameContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(userList.get(i).getUserName())
              .weight(WeightEnum.bold)
              .size(SizeEnum.xl)
              .align(AlignEnum.center)
              .build();

      // 部署名のコンテント
      LwFlexTemplateCarouselContents departmentNameContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(userList.get(i).getDepartmentName())
              .size(SizeEnum.sm)
              .align(AlignEnum.center)
              .build();

      // 会社名
      LwFlexTemplateCarouselContents organizationNameContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(userList.get(i).getOrganizationName())
              .size(SizeEnum.sm)
              .align(AlignEnum.center)
              .build();

      // ユーザー情報コンテント
      LwFlexTemplateCarouselContents userDetailContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.vertical)
              .margin(SizeEnum.xl)
              .contents(new ArrayList<>())
              .build();
      userDetailContents.getContents().add(organizationNameContents);
      userDetailContents.getContents().add(departmentNameContents);
      userDetailContents.getContents().add(userNameContents);

      // 勤務場所ラベルコンテント
      LwFlexTemplateCarouselContents workspaceLabelContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(WORKSPACE_LABEL)
              .size(SizeEnum.sm)
              .color(ColorEnum.BLACK.getLabel())
              .margin(SizeEnum.md)
              .flex(0)
              .build();

      // 勤務場所コンテント
      // 退勤・不在判定
      if (StringUtils.isEmpty(userList.get(i).getFloorName())) {
        if (userList.get(i).getLeaveDate() == null) {
          userList.get(i).setFloorName(SeatStatusEnum.ABSENCE.getLabel());
        } else {
          userList.get(i).setFloorName(SeatStatusEnum.LEAVEWORK.getLabel());
        }
      }

      LwFlexTemplateCarouselContents workspaceContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(userList.get(i).getFloorName())
              .size(SizeEnum.sm)
              .color(ColorEnum.BLACK.getLabel())
              .margin(SizeEnum.sm)
              .build();

      // 勤務場所テーブル
      LwFlexTemplateCarouselContents workspaceTable =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.baseline)
              .contents(new ArrayList<>())
              .build();
      workspaceTable.getContents().add(workspaceLabelContents);
      workspaceTable.getContents().add(workspaceContents);

      // 勤務場所ボックス
      LwFlexTemplateCarouselContents workspaceBox =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.vertical)
              .margin(SizeEnum.md)
              .paddingTop(String.valueOf(SizeEnum.xs))
              .paddingBottom(String.valueOf(SizeEnum.xs))
              .paddingStart(CAROUSEL_PADDING)
              .paddingEnd(CAROUSEL_PADDING)
              .contents(new ArrayList<>())
              .build();
      workspaceBox.getContents().add(workspaceTable);

      // 内線番号ラベルコンテント
      LwFlexTemplateCarouselContents extensionNumberLabelContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(EXTENTION_NUMBER_LABEL)
              .size(SizeEnum.sm)
              .color(ColorEnum.BLACK.getLabel())
              .margin(SizeEnum.md)
              .flex(0)
              .build();

      String extension = userList.get(i).getExtension();
      if (extension == null) {
        extension = NO_EXTENSION_NUMBER_LABEL;
      }
      LwFlexTemplateCarouselContents extensionNumberContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.text)
              .text(extension)
              .size(SizeEnum.sm)
              .color(ColorEnum.BLACK.getLabel())
              .margin(SizeEnum.sm)
              .build();

      // 内線番号テーブル
      LwFlexTemplateCarouselContents extensionNumberTable =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.baseline)
              .contents(new ArrayList<>())
              .build();
      extensionNumberTable.getContents().add(extensionNumberLabelContents);
      extensionNumberTable.getContents().add(extensionNumberContents);

      // 内線番号ボックス
      LwFlexTemplateCarouselContents extensionNumberBox =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.vertical)
              .margin(SizeEnum.md)
              .paddingTop(String.valueOf(SizeEnum.xs))
              .paddingBottom(String.valueOf(SizeEnum.xs))
              .paddingStart(CAROUSEL_PADDING)
              .paddingEnd(CAROUSEL_PADDING)
              .contents(new ArrayList<>())
              .build();
      extensionNumberBox.getContents().add(extensionNumberTable);

      // カルーセルボディコンテント
      LwFlexTemplateCarouselContents carouselBodyContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.vertical)
              .contents(new ArrayList<>())
              .build();
      carouselBodyContents.getContents().add(userDetailContents);
      carouselBodyContents.getContents().add(workspaceBox);
      carouselBodyContents.getContents().add(extensionNumberBox);

      // LINEWOKRS ID変換テーブル内に対象ユーザーのLINEWORKSログインIDが存在する場合、トーク画面へ遷移するボタン生成
      if (!Objects.isNull(userList.get(i).getLineWorksLoginId())) {
        // トーク画面へボタン
        LwFlexTemplateCarouselContents userTalkButton =
            LwFlexTemplateCarouselContents.builder()
                .action(
                    LwFlexTemplateCarouselAction.builder()
                        .type(ActionsTypeEnum.uri)
                        .label(TALK_BUTTON_LABEL)
                        .uri(appLinkUri + userList.get(i).getLineWorksLoginId())
                        .build())
                .type(ContentTypeEnum.button)
                .style(StyleEnum.primary)
                .color(ColorEnum.LINE_WORKS_DEFAULT.getLabel())
                .margin(SizeEnum.xl)
                .build();

        carouselBodyContents.getContents().add(userTalkButton);
      }

      // カルーセルボディ
      LwFlexTemplateCarouselContents carouselBody =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.bubble)
              .body(carouselBodyContents)
              .build();

      // カルーセルコンテントに追加
      lwFlexTemplateCarouselContents.getContents().add(carouselBody);
    }

    // 次のページへボタン判定
    if (userList.size() > DISPLAYABLE_MAX_NUM * nextPageNumber) {
      // トーク画面へボタン
      LwFlexTemplateCarouselContents userTalkButton =
          LwFlexTemplateCarouselContents.builder()
              .action(
                  LwFlexTemplateCarouselAction.builder()
                      .type(ActionsTypeEnum.message)
                      .label(NEXT_PAGE)
                      .text(NEXT_PAGE)
                      .postback(
                          postback
                              + "."
                              + JobPostbackEnum.PAGE.getLabel()
                              + String.valueOf(nextPageNumber + 1))
                      .build())
              .type(ContentTypeEnum.button)
              .style(StyleEnum.primary)
              .margin(SizeEnum.xl)
              .build();

      // カルーセルボディコンテント
      LwFlexTemplateCarouselContents carouselBodyContents =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.box)
              .layout(LayoutEnum.vertical)
              .contents(new ArrayList<>())
              .build();
      carouselBodyContents.getContents().add(userTalkButton);

      // カルーセルボディ
      LwFlexTemplateCarouselContents carouselBody =
          LwFlexTemplateCarouselContents.builder()
              .type(ContentTypeEnum.bubble)
              .body(carouselBodyContents)
              .build();

      lwFlexTemplateCarouselContents.getContents().add(carouselBody);
    }

    return LwFlexTemplateCarouselContent.builder()
        .type(ContentTypeEnum.flex)
        .contents(lwFlexTemplateCarouselContents)
        .altText(SEARCH_RESULT_MESSAGE.replace("{userName}", userName))
        .build();
  }

  /////////////////////////////////////////////////////////////

  // 汎用処理///////////////////////////////////////////////////////////
  // !! 省略しています !!
  /////////////////////////////////////////////////////////////

}
