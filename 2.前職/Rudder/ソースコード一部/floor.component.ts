import { Component, DoCheck, ElementRef, ViewChild } from '@angular/core';
import { SeatUser } from 'src/app/services/floor/entity/seat-user';
import { MatDialog } from '@angular/material/dialog';
import { SeatData } from 'src/app/services/floor/entity/seat-data';
import { DetailUserModalComponent } from 'src/app/user/detail-user-modal/detail-user-modal.component';

/** 座席情報を表示するコンポーネント */
@Component({
  selector: 'rudder-floor',
  templateUrl: './floor.component.html',
  styleUrls: ['./floor.component.scss'],
})
export class FloorComponent implements DoCheck {
  /** フロア画像URL */
  public imgSrc?: string;

  /** 座席情報 */
  public seatDataSet?: SeatData[];

  /** 座席ID */
  public seatId?: number;

  /** 座席ピンの調整座標 */
  public pinPosition: number = 20;

  /** 着席者名の調整座標 */
  public namePosition: number = 30;

  /** マウスカーソルの左右位置判定フラグ */
  public leftPositionFlag: boolean = false;

  /** マウスカーソルの上下位置判定フラグ */
  public topPositionFlag: boolean = false;

  /** 画像幅 */
  public width: number = 0;

  /** 画像高さ */
  public height: number = 0;

  /** 画像スクロールトップ */
  public scrollTop: number = 0;

  /** 画像スクロールレフト */
  public scrollLeft: number = 0;

  /** 着席時氏名格納マップ */
  public nameMap: { [key: number]: Array<SeatUser[]> } = {};

  /** 画像エレメント */
  @ViewChild('imgDiv') public imgDiv?: ElementRef;

  /** 座席幅閾値 */
  readonly SEAT_WIDTH_THRESHOLD = 140;

  /**
   * コンストラクタ
   *
   * @param dialog モーダルウィンドウ
   */
  public constructor(private dialog: MatDialog) {}

  /** 値が変更された際のイベント */
  public ngDoCheck(): void {
    if (this.seatId !== undefined && this.seatDataSet !== undefined) {
      for (let seat of this.seatDataSet) {
        if (seat.seatId === this.seatId) {
          this.width = this.imgDiv?.nativeElement.offsetWidth;
          this.height = this.imgDiv?.nativeElement.offsetHeight;
          this.scrollLeft = (seat.startX + seat.endX) / 2 - this.width / 2;
          this.scrollTop = (seat.startY + seat.endY) / 2 - this.height / 2;
        }
      }
    }
    if (this.seatDataSet !== undefined) {
      this.nameMap = this.generateUserNameList(this.seatDataSet);
    }
  }

  /**
   * ユーザー名リスト生成
   *
   * 着席している氏名を表示するリストを作成する。
   * 横幅が閾値を超えている場合は2名ずつ順にリストに格納する。
   * 画面からseatIdで取得できるようにMapにseatIdをキーとして格納する。
   *
   * @param { SeatData[] } seatData
   * @return  { { [key: number]: Array<SeatUser[]>} } seatIdをキーとしたユーザー名リスト
   */
  private generateUserNameList(seatData: SeatData[]): {
    [key: number]: Array<SeatUser[]>;
  } {
    const nameMap: { [key: number]: Array<SeatUser[]> } = {};
    for (let seat of seatData) {
      let namesArray: SeatUser[][] = [];
      let names: SeatUser[] = [];
      seat.seatUsers.map((user, index) => {
        names.push(user);
        if (seat.endX - seat.startX > this.SEAT_WIDTH_THRESHOLD) {
          if (index % 2 !== 0 || index === seat.seatUsers.length - 1) {
            namesArray.push(names);
            nameMap[seat.seatId] = namesArray;
            names = [];
          }
        } else {
          namesArray.push(names);
          nameMap[seat.seatId] = namesArray;
          names = [];
        }
      });
    }
    return nameMap;
  }

  /**
   * 選択されたユーザIDをonSearchに渡す
   *
   * @param seatUser 選択されたユーザ
   */
  public onSelectUser(seatUser: SeatUser): void {
    this.onSearch(seatUser.userId);
  }

  /**
   * 渡されたユーザの情報をモーダルに渡して表示する
   *
   * @param userId ユーザID
   */
  public onSearch(userId: string): void {
    const _dialogRef = this.dialog.open(DetailUserModalComponent, {
      height: '350px',
      width: '400px',
      data: {
        userId: userId,
      },
      panelClass: 'search-dialog',
      autoFocus: false,
      restoreFocus: false,
    });
  }

  /**
   * 渡された座標の引き算を行い、表示する座席の開始座標を求め返却する
   *
   * @param startCoordinate 開始座標
   * @param endCoordinate 終了座標
   * @returns 計算結果
   */
  public subCoordinate(startCoordinate: number, endCoordinate: number): number {
    return Math.abs(startCoordinate - endCoordinate);
  }

  /**
   * 渡された座標の比較を行い、小さい値を返却する
   *
   * @param startCoordinate 開始座標
   * @param endCoordinate 終了座標
   * @returns 比較結果
   */
  public comCoordinate(startCoordinate: number, endCoordinate: number): number {
    if (startCoordinate >= endCoordinate) {
      return endCoordinate;
    } else {
      return startCoordinate;
    }
  }

  /**
   * ハイライトイベントの発生している座席にフォーカスされた際に、seatIdをリセットしアニメーションを停止する
   *
   * @param event マウスイベント
   * @param seatId 座席ID
   */
  public onMousePosition(event: MouseEvent, seatId: number): void {
    if (this.seatId === seatId) {
      this.seatId = undefined;
    }
  }

  /**
   * 画像スクロール時イベント
   *
   * @param element 画像スクロールエレメント
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onScroll(element: any): void {
    this.scrollTop = element.scrollTop;
    this.scrollLeft = element.scrollLeft;
  }
}
