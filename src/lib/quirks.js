export const QUIRKS = {
  chokku: {
    label: "덤불에 숨었다 튀어나와요!",
    init: function(s) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { state: 'visible', timer: 0 };
    },
    update: function(s, dt) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { state: 'visible', timer: 0 };
      s.q.timer += dt;
      if (s.q.state === 'visible' && s.q.timer >= 1800) {
        s.q.state = 'hidden';
        s.q.timer = 0;
        s.visible = false;
        var r = s.size / 2;
        s.x = Math.random() * (s.W - s.size) + r;
        s.y = Math.random() * (s.H - s.size) + r;
      } else if (s.q.state === 'hidden' && s.q.timer >= 1200) {
        s.q.state = 'visible';
        s.q.timer = 0;
        s.visible = true;
      }
    },
    draw: function(ctx, s) {
      if (s.capturing) return;
      if (s.tired) return;
      if (s.q && s.q.state === 'hidden') {
        ctx.fillStyle = '#22A45D';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A7A44';
        ctx.beginPath();
        ctx.arc(s.x - 10, s.y - 10, s.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  ppakku: {
    label: "불꽃 대시로 빠르게 움직여요!",
    init: function(s) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { timer: 0, dashing: false, trails: [] };
    },
    update: function(s, dt) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { timer: 0, dashing: false, trails: [] };
      s.q.timer += dt;
      if (!s.q.dashing && s.q.timer >= 2000) {
        s.q.dashing = true;
        s.q.timer = 0;
        s.speed = 3;
      } else if (s.q.dashing && s.q.timer >= 400) {
        s.q.dashing = false;
        s.q.timer = 0;
        s.speed = 1;
      }
      if (s.q.dashing) {
        s.q.trails.push({ x: s.x, y: s.y });
        if (s.q.trails.length > 8) {
          s.q.trails.shift();
        }
      } else {
        s.q.trails = [];
      }
    },
    draw: function(ctx, s) {
      if (s.capturing) return;
      if (s.tired) return;
      if (s.q && s.q.dashing && s.q.trails.length > 0) {
        ctx.strokeStyle = '#E03131';
        ctx.lineWidth = s.size * 0.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.q.trails[0].x, s.q.trails[0].y);
        for (var i = 1; i < s.q.trails.length; i++) {
          ctx.lineTo(s.q.trails[i].x, s.q.trails[i].y);
        }
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }
  },
  nokku: {
    label: "전기 보호막을 켜고 꺼요!",
    init: function(s) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { timer: 0 };
    },
    update: function(s, dt) {
      if (s.capturing) return;
      if (s.tired) return;
      s.q = s.q || { timer: 0 };
      s.q.timer += dt;
      if (s.q.timer >= 3000) {
        s.q.timer -= 3000;
      }
      s.shield = (s.q.timer < 1500);
    },
    draw: function(ctx, s) {
      if (s.capturing) return;
      if (s.tired) return;
      if (s.shield) {
        ctx.strokeStyle = '#F2B705';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
  heenkku: {
    label: "얼음 방패 때문에 잘 안 잡혀요!",
    init: function(s) {
      if (s.capturing) return;
      if (s.tired) return;
      s.catchRate *= 0.7;
      s.speed = 0.6;
      s.q = s.q || { flashBlue: 0 };
    },
    update: function(s, dt) {
      if (s.capturing) return;
      if (s.tired) return;
      if (s.q && s.q.flashBlue > 0) {
        s.q.flashBlue -= dt;
      }
    },
    draw: function(ctx, s) {
      if (s.capturing) return;
      if (s.tired) return;
      
      var size = s.size * (s.depth || 1);
      
      if (s.q && s.q.flashBlue > 0) {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      var breakouts = s.breakouts || 0;
      if (breakouts > 0) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var i = 0; i < breakouts; i++) {
          var angle = (i * Math.PI * 2) / Math.max(breakouts, 5);
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + Math.cos(angle) * size * 0.6, s.y + Math.sin(angle) * size * 0.6);
        }
        ctx.stroke();
      }
    },
    onBreakout: function(s) {
      if (s.tired) return;
      s.q = s.q || {};
      s.q.flashBlue = 800;
    }
  },
  kkumkku: {
    label: "가짜 분신들과 섞여요!",
    init: function(s) {
      if (s.capturing) return;
      if (s.tired) return;
      s.decoys = [];
      for (var i = 0; i < 3; i++) {
        var r = s.size / 2;
        s.decoys.push({
          x: Math.random() * (s.W - s.size) + r,
          y: Math.random() * (s.H - s.size) + r,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4
        });
      }
    },
    update: function(s, dt) {
      if (s.capturing) return;
      if (s.tired) return;
      if (s.decoys) {
        var sm = dt * 60 / 1000;
        var r = s.size / 2;
        for (var i = 0; i < s.decoys.length; i++) {
          var d = s.decoys[i];
          if (d.vx === undefined) {
            d.vx = (Math.random() - 0.5) * 4;
            d.vy = (Math.random() - 0.5) * 4;
          }
          d.x += d.vx * sm;
          d.y += d.vy * sm;
          if (d.x < r) { d.x = r; d.vx *= -1; }
          if (d.x > s.W - r) { d.x = s.W - r; d.vx *= -1; }
          if (d.y < r) { d.y = r; d.vy *= -1; }
          if (d.y > s.H - r) { d.y = s.H - r; d.vy *= -1; }
        }
      }
    },
    draw: function(ctx, s) {
      if (s.capturing) return;
      if (s.tired) return;
    },
    onBreakout: function(s) {
      if (s.tired) return;
      if (s.decoys && s.decoys.length > 0) {
        var i = Math.floor(Math.random() * s.decoys.length);
        var tx = s.x, ty = s.y;
        s.x = s.decoys[i].x;
        s.y = s.decoys[i].y;
        s.decoys[i].x = tx;
        s.decoys[i].y = ty;
      }
    }
  }
};
