export const THRESHOLD = 0.60;
export const MIN_GAP = 0.15;

let model = null;
let referenceEmbeddings = [];
let loadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function loadMatcher() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');

      model = await window.mobilenet.load({ version: 2, alpha: 0.5 });

      const targets = [
        { i: 0, v: 'a' }, { i: 0, v: 'b' },
        { i: 1, v: 'a' }, { i: 1, v: 'b' },
        { i: 2, v: 'a' }, { i: 2, v: 'b' },
        { i: 3, v: 'a' }, { i: 3, v: 'b' },
        { i: 4, v: 'a' }, { i: 4, v: 'b' },
        { i: 5, v: 'a' }, { i: 5, v: 'b' }
      ];

      for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        const src = import.meta.env.BASE_URL + 'targets/t' + t.i + t.v + '.jpg';
        const img = new Image();
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const embedding = window.tf.tidy(() => {
          const infer = model.infer(img, true);
          return infer.div(window.tf.norm(infer)).clone();
        });
        
        referenceEmbeddings.push({ target: t.i, tensor: embedding });
      }

      return true;
    } catch (err) {
      console.error('Matcher load error:', err);
      return false;
    }
  })();

  return loadPromise;
}

export function matchFrame(video) {
  if (!model || referenceEmbeddings.length === 0) return null;

  return window.tf.tidy(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    
    const size = Math.min(video.videoWidth, video.videoHeight);
    if (size === 0) return null;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 224, 224);
    
    const infer = model.infer(canvas, true);
    const query = infer.div(window.tf.norm(infer));

    let scores = [0, 0, 0, 0, 0, 0];
    
    for (let i = 0; i < referenceEmbeddings.length; i++) {
      const ref = referenceEmbeddings[i];
      const similarity = window.tf.sum(window.tf.mul(query, ref.tensor)).dataSync()[0];
      
      if (similarity > scores[ref.target]) {
        scores[ref.target] = similarity;
      }
    }
    
    let bestTarget = -1;
    let bestScore = -1;
    let secondBestScore = -1;
    
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > bestScore) {
        secondBestScore = bestScore;
        bestScore = scores[i];
        bestTarget = i;
      } else if (scores[i] > secondBestScore) {
        secondBestScore = scores[i];
      }
    }
    
    const gap = bestScore - secondBestScore;
    
    if (bestScore >= THRESHOLD && gap >= MIN_GAP) {
      return { target: bestTarget, score: bestScore, gap: gap };
    }
    
    return null;
  });
}
