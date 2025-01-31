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
            <h3>Notion、どこから始める？</h3>
            <p>
            Notionは自由度が高く、できることが多い分、最初に何から手をつければいいのか分からなくなることもあります。
              <br />
              私も最初に触れたとき、使いこなすイメージが持てず、一度は使うのをやめてしまいました。
              <br />
              それでも、まずはメモやTo-Doリストなど身近な使い方から始めてみると、少しずつ活用の幅が広がっていきました。
              <br />
              今では、仕事ではタスク管理や経費管理、プライベートでは習慣管理やWishlistなど、さまざまな場面で役立てています。
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
              <h3>少しずつ触れていくことが大切</h3>
              <br />
              最初からすべてを理解しようとしなくても大丈夫です。
              <br />
              学習コストが高いツールだからこそ、
              <br />
              無理なく少しずつ慣れていくことが大切だと思います。
              <br />
              続けるうちに、自分に合った使い方が見えてきて、
              <br />
              気づけば自然と使いこなせるようになっているかもしれません。
              <br />
              その頃には、より便利に使うための工夫ができるようになり、
              <br />
              自分にとって最適な形が見つかっているはずです。
              <br />
              まずは気軽に試してみてください。少しずつ触れることで、
              <br />
              「こんなこともできるんだ」と新しい発見があるはずです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ContentBlock02;
