'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getSocket } from '@/lib/socket';
import { layDanhSachThietBi, tongQuan, batTatThietBi } from '@/lib/api';

const ICON_MAP = {
  light: '💡', fan: '🌀', camera: '📷',
  sensor: '🌡️', relay: '⚡', lock: '🔒', thermostat: '🌡️',
};

function DeviceCard({ device, onToggle, dangTai }) {
  const batLen = device.state?.isOn;
  return (
    <div
      className={`device-card ${batLen ? 'on' : ''} ${dangTai ? 'loading' : ''}`}
      onClick={() => onToggle(device._id)}
    >
      <div className={`device-status-dot ${batLen ? 'on' : ''}`} />
      <div className="device-icon-wrap">{ICON_MAP[device.type] || '📦'}</div>
      <div className="device-name">{device.name}</div>
      <div className="device-status">{batLen ? '• ĐANG BẬT' : '• ĐANG TẮT'}</div>
    </div>
  );
}

function SensorCard({ nhan, giaTri, donVi, icon, mau }) {
  return (
    <div className="sensor-card">
      <div className="sensor-info">
        <div className="sensor-label">{nhan}</div>
        <div className="sensor-value">
          {giaTri ?? 0}
          <span className="sensor-unit"> {donVi}</span>
        </div>
      </div>
      <div className="sensor-icon" style={{ color: mau }}>{icon}</div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab]         = useState('dashboard');
  const [thietBis, setThietBis]           = useState([]);
  const [camBien, setCamBien]             = useState({ nhietDo: null, doAm: null, anhSang: null, chuyenDong: null });
  const [mqttKetNoi, setMqttKetNoi]       = useState(false);
  const [heThongOk, setHeThongOk]         = useState(true);
  const [dangTaiId, setDangTaiId]         = useState(null);
  const [thoiGian, setThoiGian]           = useState(new Date());
  const [suKienCamera, setSuKienCamera]   = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); }
  }, [status, router]);

  useEffect(() => {
    const id = setInterval(() => setThoiGian(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchDuLieu = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const [resThietBi, resTongQuan] = await Promise.all([
        layDanhSachThietBi(),
        tongQuan(),
      ]);
      setThietBis(resThietBi.data.data || []);
      const tq = resTongQuan.data.data;
      setCamBien({
        nhietDo:    tq.duLieuMoiNhat?.nhietDo?.giatri    ?? null,
        doAm:       tq.duLieuMoiNhat?.doAm?.giatri        ?? null,
        anhSang:    null,
        chuyenDong: tq.duLieuMoiNhat?.chuyenDong?.giatri  ?? null,
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err.message);
      setHeThongOk(false);
    }
  }, [status]);

  useEffect(() => { fetchDuLieu(); }, [fetchDuLieu]);

  useEffect(() => {
    const sckt = getSocket();

    sckt.on('mqttStatus', ({ connected }) => setMqttKetNoi(connected));
    sckt.on('deviceStateChanged', ({ deviceId, state }) => {
      setThietBis(prev => prev.map(tb => tb._id === deviceId ? { ...tb, state } : tb));
    });
    sckt.on('sensorUpdate', ({ loaiCamBien, value }) => {
      setCamBien(prev => {
        if (loaiCamBien === 'temperature') return { ...prev, nhietDo: value };
        if (loaiCamBien === 'humidity')    return { ...prev, doAm: value };
        if (loaiCamBien === 'light_level') return { ...prev, anhSang: value };
        if (loaiCamBien === 'motion')      return { ...prev, chuyenDong: value };
        return prev;
      });
    });
    sckt.on('cameraEvent', (data) => {
      setSuKienCamera(data);
      setTimeout(() => setSuKienCamera(null), 5000);
    });

    return () => {
      sckt.off('mqttStatus');
      sckt.off('deviceStateChanged');
      sckt.off('sensorUpdate');
      sckt.off('cameraEvent');
    };
  }, []);

  const xulyToggle = async (id) => {
    setDangTaiId(id);
    try {
      const res = await batTatThietBi(id);
      setThietBis(prev => prev.map(tb => tb._id === id ? res.data.data : tb));
    } catch (err) {
      alert('Lỗi điều khiển thiết bị: ' + (err.response?.data?.msg || err.message));
    } finally {
      setDangTaiId(null);
    }
  };

  const dangXuat = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Đang tải hệ thống...</div>;
  }

  const denList  = thietBis.filter(tb => tb.type === 'light');
  const quatList = thietBis.filter(tb => tb.type === 'fan');
  const khac     = thietBis.filter(tb => !['light','fan','camera','sensor'].includes(tb.type));

  const thuViet = ['CN','T2','T3','T4','T5','T6','T7'];
  const thuHienTai = thuViet[thoiGian.getDay()];
  const ngayHienTai = `${String(thoiGian.getDate()).padStart(2,'0')}/${String(thoiGian.getMonth()+1).padStart(2,'0')}/${thoiGian.getFullYear()}`;
  const gioHienTai  = thoiGian.toLocaleTimeString('vi-VN', { hour12: false });

  const gioChinh = thoiGian.getHours();
  const loiChao = gioChinh < 12 ? 'Chào buổi sáng' : gioChinh < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const tenUser = session?.user?.name || session?.user?.email?.split('@')[0] || 'Bạn';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">N</div>
        <nav className="sidebar-nav">
          <button className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">🏠</button>
          <button className={`sidebar-btn ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')} title="Thiết bị">📟</button>
          <button className={`sidebar-btn ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')} title="Biểu đồ">📈</button>
          <button className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Cài đặt">⚙️</button>
        </nav>
        <div className="sidebar-avatar" onClick={dangXuat} title="Đăng xuất" style={{ cursor: 'pointer' }}>
          {session?.user?.image ? (
            <img src={session.user.image} alt="avt" style={{width: '100%', height: '100%', borderRadius: '50%'}} />
          ) : (
            tenUser.charAt(0).toUpperCase()
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="header-row fade-in">
          <div className="header-greeting">
            <h1>{loiChao}, {tenUser}</h1>
            <p>Hệ thống đang hoạt động ổn định.</p>
          </div>
          <div className="header-info">
            <div className={`mqtt-badge ${mqttKetNoi ? 'connected' : 'disconnected'}`}>
              <div className="dot" />
              {mqttKetNoi ? 'MQTT Connected' : 'MQTT Not Connected'}
            </div>
            <div className="date-display">
              🕐 {gioHienTai} &nbsp;|&nbsp; {thuHienTai}, {ngayHienTai}
            </div>
          </div>
        </div>

        {suKienCamera && (
          <div className="glass-card fade-in" style={{
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.08)'
          }}>
            <span style={{ fontSize: 20 }}>📸</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Camera AI: {suKienCamera.loaiSuKien === 'face_detected' ? 'Phát hiện khuôn mặt!' : 'Phát hiện chuyển động!'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="dashboard-grid">
            <div className="camera-section">
              <div>
                <div className="section-title">📹 Camera Live</div>
                <div className="camera-feed">
                  <div className="camera-label">Raspberry Pi Stream</div>
                  <div className="camera-placeholder">
                    <div className="cam-icon">📷</div>
                    <p>Raspberry Pi Stream</p>
                    <a href="http://raspberrypi.local:8080" target="_blank" rel="noreferrer">Kết nối Stream →</a>
                  </div>
                </div>
              </div>

              {denList.length > 0 && (
                <div>
                  <div className="section-title">💡 Điều khiển đèn</div>
                  <div className="devices-grid">
                    {denList.map(tb => <DeviceCard key={tb._id} device={tb} onToggle={xulyToggle} dangTai={dangTaiId === tb._id} />)}
                  </div>
                </div>
              )}

              {quatList.length > 0 && (
                <div>
                  <div className="section-title">🌀 Điều khiển quạt</div>
                  <div className="devices-grid">
                    {quatList.map(tb => <DeviceCard key={tb._id} device={tb} onToggle={xulyToggle} dangTai={dangTaiId === tb._id} />)}
                  </div>
                </div>
              )}
              
              {khac.length > 0 && (
                <div>
                  <div className="section-title">📟 Thiết bị khác</div>
                  <div className="devices-grid">
                    {khac.map(tb => <DeviceCard key={tb._id} device={tb} onToggle={xulyToggle} dangTai={dangTaiId === tb._id} />)}
                  </div>
                </div>
              )}
              {thietBis.length === 0 && <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thiết bị nào. Thêm thiết bị qua API.</div>}
            </div>

            <div className="right-panel">
              <div className="section-title">🌿 Môi trường</div>
              <SensorCard nhan="Nhiệt độ (DHT11)"  giaTri={camBien.nhietDo}    donVi="°C"  icon="🌡️" mau="var(--orange)" />
              <SensorCard nhan="Độ ẩm (DHT11)"     giaTri={camBien.doAm}       donVi="%"   icon="💧" mau="var(--blue)"   />
              <SensorCard nhan="Ánh sáng"           giaTri={camBien.anhSang}    donVi="lux" icon="☀️" mau="var(--orange)" />
              <div className="sensor-card">
                <div className="sensor-info">
                  <div className="sensor-label">Chuyển động (PIR)</div>
                  <div className="sensor-value" style={{ fontSize: 18, color: camBien.chuyenDong ? 'var(--orange)' : 'var(--green)' }}>
                    {camBien.chuyenDong ? 'Có người!' : 'Không'}
                  </div>
                </div>
                <div className="sensor-icon">🚶</div>
              </div>

              <div className="system-card">
                <div className="system-title">⚡ Trạng thái hệ thống</div>
                <div className="system-status">
                  {heThongOk ? 'Hoạt động tốt' : 'Cần kiểm tra'}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                  Thiết bị online: {thietBis.filter(tb => tb.status === 'online').length} / {thietBis.length}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card fade-in" style={{ padding: 60, textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🛠️</div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Đang phát triển</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Tính năng <b>{activeTab === 'devices' ? 'Quản lý thiết bị nâng cao' : activeTab === 'charts' ? 'Biểu đồ phân tích lịch sử' : 'Cài đặt hệ thống'}</b> sẽ sớm ra mắt ở phiên bản tiếp theo.
            </p>
          </div>
        )}
        <div className="footer">© 2026 NEXUS HOME OS</div>
      </main>
    </div>
  );
}
