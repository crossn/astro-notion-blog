import Cross from '/home/cross.png';
import Mainichi from '/home/mainichi.png';
import styles from '../../styles/home.module.css';

function ContentBlock02() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <div
            className={styles.text}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
          >
            <h3>挫折を経験したからこそ</h3>
            <p>
              Notionは学習コストが高く、何でもできるが故に何から始めればいいのかが分からず、一度挫折を経験しています。
              <br />
              ですが少し捉え方を変え、できそうな使い方からまずはじめてみることにしました。
              <br />
              最初は単純なメモやTo-Doリスト....
              <br />
              そこから少し慣れてくるとナレッジや連絡事項など情報共有ツールとして活用できるようになりました。
              <br />
              今ではプロジェクト管理ツールや経費管理、勤怠管理など幅広く活用できており、
              <br />
              Notionの認定資格も取得できるほどに知識を付けることができています。
              <br />
              <br />
              Notionを触ってみて使い方がわからずに使うことを諦めてしまっている人に対して、
              <br />
              <b>「こんなに勿体ないことはない」</b>と伝えたいです。
            </p>
          </div>
          <div className={styles.image}>
            <img src={Cross} />
          </div>
        </div>
      </div>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionContainer}>
          <div className={styles.image} style={{ marginRight: '20px' }}>
            <img src={Mainichi} />
          </div>
          <div
            className={styles.text}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <p>
              <h3>今はできなくても...</h3>
              <br />
              少しずつでも良いから自分なりの使い方でさわってみて、
              <br />
              毎日継続して使うことからはじめてみて欲しい。
              <br />
              そうすれば、自分なりの使い方が徐々に確立されてきて、
              <br />
              何もわからなかった自分が嘘みたいに思えるほどに、
              <br />
              Notionはきっとあなたにとって
              <br />
              なくてはならないツールになると確信しています。
              <br />
              <br />
              そのとき、私が作っているテンプレートと同等、もしくはそれ以上のものをご自身で作れるほどに成長しているはずです。自分の可能性を信じて、諦めずにまずは使ってみることから始めてみましょう！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock02;
