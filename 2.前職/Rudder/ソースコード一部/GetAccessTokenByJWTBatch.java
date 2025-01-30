// !! import部分を省略しています !!

/** JWTによるアクセストークン取得バッチ */
@Component
@ConditionalOnProperty(
    value = {"batch"},
    havingValue = "getAccessTokenByJWT")
public class GetAccessTokenByJWTBatch extends AbstractService implements CommandLineRunner {

  /** LINEWORKS資格情報取得マッパー */
  @Autowired private MstLineworksCredentialsMapper mstLineworksCredentialsMapper;

  /** レストテンプレート */
  @Autowired private RestTemplate restTemplate;

  /** ボットID */
  @Value("${lineworks.bot.id}")
  private String botId;

  /** トークン取得URL */
  @Value("${lineworks.api.url}")
  private String apiTokenUrl;

  /** JWTを用いたアクセストークン取得処理を行う */
  @Override
  public void run(String... args) throws NoSuchAlgorithmException, InvalidKeySpecException {

    // LINEWORKS資格情報マスタからbotIdで検索し、レコード取得
    MstLineworksCredentials mstLineworksCredentials;
    try {
      mstLineworksCredentials =
          Optional.ofNullable(mstLineworksCredentialsMapper.selectByPrimaryKey(botId))
              .orElseThrow(
                  () -> {
                    // ボットIDでエラーが取れなかった用のメッセージ
                    logger.error(MessageCd.N_SD_0002_E);
                    return new BusinessLogicException(MessageCd.N_SD_0002_E);
                  });

    } catch (DataAccessException e) {
      logger.error(MessageCd.N_SD_0002_E, e);
      throw e;
    } catch (BusinessLogicException e) {
      throw e;
    } catch (Exception e) {
      logger.error(MessageCd.N_SQ_0010_E, e);
      throw e;
    }

    RSAPrivateKey rsaPrivateKey;
    try {
      // 指定アルゴリズム（RSA）の非公開鍵を変換するKeyFactoryオブジェクトを取得
      final KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      final PKCS8EncodedKeySpec privateSpec =
          new PKCS8EncodedKeySpec(
              Base64.getDecoder().decode(mstLineworksCredentials.getPrivateKey()));
      // 非公開鍵オブジェクトを生成
      rsaPrivateKey = (RSAPrivateKey) keyFactory.generatePrivate(privateSpec);
    } catch (InvalidKeySpecException e) {
      //  非公開鍵オブジェクト生成に失敗した場合実行
      logger.error(MessageCd.R_SA_0053_E, e);
      throw e;
    } catch (Exception e) {
      logger.error(MessageCd.N_SQ_0010_E, e);
      throw e;
    }

    // JWT生成時のヘッダー作成
    final Map<String, Object> headerClaims = new HashMap<>();

    // JWT生成時のペイロード（データ本体）作成
    final Map<String, Object> payloadClaims =
        new HashMap<>() {
          {
            put("iss", mstLineworksCredentials.getClientId());
            put("sub", mstLineworksCredentials.getServiceAccount());
            put("iat", LocalDateTime.now().atZone(ZoneOffset.UTC).toEpochSecond());
            put("exp", LocalDateTime.now().atZone(ZoneOffset.UTC).plusHours(1).toEpochSecond());
          }
        };

    // JWT生成のための署名に用いるアルゴルズム定義
    final Algorithm algorithm = Algorithm.RSA256(null, rsaPrivateKey);

    String jwtToken = null;
    try {
      // JWT生成
      jwtToken = JWT.create().withHeader(headerClaims).withPayload(payloadClaims).sign(algorithm);
    } catch (JWTCreationException e) {
      logger.error(MessageCd.R_SA_0054_E, e, payloadClaims.toString());
      throw e;
    } catch (Exception e) {
      logger.error(MessageCd.N_SQ_0010_E, e);
      throw e;
    }

    // アクセストークン発行API実行のボディ部作成
    final MultiValueMap<String, String> accessTokenRequestMap = new LinkedMultiValueMap<>();
    accessTokenRequestMap.add("assertion", jwtToken);
    accessTokenRequestMap.add("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    accessTokenRequestMap.add("client_id", mstLineworksCredentials.getClientId());
    accessTokenRequestMap.add("client_secret", mstLineworksCredentials.getClientSecret());
    accessTokenRequestMap.add("scope", "bot, directory, user, calendar");

    // アクセストークン発行API実行のヘッダ部作成
    final HttpHeaders httpHeaders = new HttpHeaders();
    httpHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    // エンティティ作成
    RequestEntity<MultiValueMap<String, String>> entity =
        RequestEntity.post(URI.create(apiTokenUrl))
            .headers(httpHeaders)
            .body(accessTokenRequestMap);

    // アクセストークン取得API実行
    ResponseEntity<LwAccessTokenIssueResponse> lwAccessTokenIssueResponse;
    try {
      lwAccessTokenIssueResponse = restTemplate.exchange(entity, LwAccessTokenIssueResponse.class);
    } catch (HttpClientErrorException | HttpServerErrorException e) {
      logger.error(
          MessageCd.R_SA_0055_E,
          e,
          entity.toString(),
          String.valueOf(e.getStatusCode().value()),
          e.getStatusText());
      throw e;
    } catch (Exception e) {
      logger.error(MessageCd.N_SQ_0010_E, e);
      throw e;
    }

    // レスポンスからアクセストークン取得
    final String accessToken =
        Objects.requireNonNull(lwAccessTokenIssueResponse.getBody()).getAccessToken();

    // レスポンスからリフレッシュトークン取得
    String refreshToken =
        Objects.requireNonNull(lwAccessTokenIssueResponse.getBody()).getRefreshToken();

    // LINEWORKS資格情報マスタへ更新するためのレコード作成
    LocalDateTime currentDateTime = LocalDateTime.now();
    final MstLineworksCredentials mstLineworksCredentialsUpdate = new MstLineworksCredentials();
    mstLineworksCredentialsUpdate.setBotId(this.botId);
    mstLineworksCredentialsUpdate.setAccessToken(accessToken);
    mstLineworksCredentialsUpdate.setRefreshToken(refreshToken);
    mstLineworksCredentialsUpdate.setUpdatedAt(currentDateTime);

    // 新規トランザクション取得
    TransactionStatus transaction = getNewTransaction();
    try {
      // LINEWORKS資格情報マスタへ更新
      int result =
          mstLineworksCredentialsMapper.updateByPrimaryKeySelective(mstLineworksCredentialsUpdate);
      // 0件更新、あるいは2件以上更新の場合に例外スロー
      if (result != 1) {
        // DataAccessException へスロー
        throw new IncorrectUpdateSemanticsDataAccessException(TableIdEnum.TR00014.tableName());
      }
      commit(transaction);

    } catch (DataAccessException e) {
      logger.error(MessageCd.N_SD_0002_E, e);
      rollback(transaction);
      throw e;
    } catch (Exception e) {
      logger.error(MessageCd.N_SQ_0010_E, e);
      rollback(transaction);
      throw e;
    }
  }
}
