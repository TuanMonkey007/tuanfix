// VÍ DỤ gói cập nhật: thêm tính năng mới mà người dùng chỉ cần bấm "Cập nhật".
// Lấy bộ công cụ của app qua biến toàn cục (chỉ dùng được module có sẵn của Node: fs, os, dns...).
const k = global.helpdeskToolkit;

module.exports = [
  {
    id: 'system_time_sync',
    category: 'system',
    title: 'Đồng bộ lại giờ',
    quick: true,
    dangerous: true,
    confirmText: () => 'Đồng bộ lại đồng hồ hệ thống với máy chủ thời gian Internet (cần quyền quản trị).',
    description: 'Đồng bộ đồng hồ hệ thống với máy chủ thời gian (NTP). Dùng khi system_time_check báo giờ lệch.',
    params: { type: 'object', properties: {} },
    async run() {
      const r = k.isWin
        ? await k.elevated("Set-Service w32time -StartupType Automatic; Start-Service w32time -ErrorAction SilentlyContinue; w32tm /resync /force", { reason: 'đồng bộ giờ' })
        : await k.elevated('sntp -sS time.apple.com', { reason: 'đồng bộ giờ' });
      if (r.cancelled) return k.fail(r.stderr);
      return r.code === 0 ? k.ok('Đã đồng bộ giờ hệ thống.', r.stdout) : k.fail('Đồng bộ giờ thất bại.', r.stdout + r.stderr);
    },
  },
  {
    id: 'network_check_site',
    category: 'network',
    title: 'Kiểm tra truy cập website',
    description: 'Kiểm tra máy có truy cập được một website/máy chủ cụ thể không (DNS + HTTPS + thời gian phản hồi). Dùng khi người dùng báo "không vào được trang X".',
    params: { type: 'object', properties: { url: { type: 'string', description: 'Địa chỉ, ví dụ https://mail.congty.vn' } }, required: ['url'] },
    async run({ url }) {
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      let host;
      try { host = new URL(url).hostname; } catch { return k.fail('Địa chỉ không hợp lệ.'); }
      const lines = [];
      try { const a = await require('dns').promises.lookup(host, { all: true }); lines.push(`✅ DNS: ${host} → ${a.map((x) => x.address).join(', ')}`); }
      catch (e) { return k.fail(`Không phân giải được tên miền ${host} (${e.code}).`, 'Kiểm tra lại địa chỉ, hoặc thử xoá cache DNS / đổi DNS.'); }
      const t0 = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
        lines.push(`✅ HTTP ${res.status} trong ${Date.now() - t0} ms`);
        return k.ok(`Truy cập được ${host} (HTTP ${res.status}, ${Date.now() - t0} ms).`, lines.join('\n'));
      } catch (e) {
        const code = e.cause ? e.cause.code || e.cause.message : e.message;
        lines.push(`❌ Kết nối lỗi: ${code}`);
        return k.fail(`Phân giải được tên miền nhưng không kết nối được tới ${host} (${code}).`, lines.join('\n') + '\nCó thể do tường lửa, proxy, VPN, chứng chỉ hoặc máy chủ đang lỗi.');
      }
    },
  },
];
