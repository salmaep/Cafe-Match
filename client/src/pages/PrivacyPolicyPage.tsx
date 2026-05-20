import { Link } from "react-router-dom";
import Seo from "../components/seo/Seo";

const LAST_UPDATED = "20 Mei 2025";
const CONTACT_EMAIL = "support@cafematch.id";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20">
      <Seo
        title="Kebijakan Privasi"
        description="Pelajari bagaimana CafeMatch mengumpulkan, menggunakan, dan melindungi data pribadi Anda."
      />

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        {/* Title */}
        <h1
          className="text-4xl font-normal text-[#1C1C1A] leading-tight tracking-tight mb-2"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Kebijakan Privasi
        </h1>
        <p className="text-sm text-[#8A8880] mb-8">
          Terakhir diperbarui: {LAST_UPDATED}
        </p>

        <div className="space-y-8 text-[#1C1C1A]">
          {/* 1 */}
          <Section title="1. Pendahuluan">
            <p>
              CafeMatch ("<strong>kami</strong>", "<strong>aplikasi</strong>")
              menghargai privasi Anda. Kebijakan Privasi ini menjelaskan jenis
              data yang kami kumpulkan, cara kami menggunakannya, dan hak-hak
              Anda atas data tersebut ketika Anda menggunakan layanan CafeMatch
              melalui web maupun aplikasi mobile.
            </p>
            <p className="mt-2">
              Dengan mendaftar atau menggunakan CafeMatch, Anda menyetujui
              praktik yang dijelaskan dalam kebijakan ini.
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Data yang Kami Kumpulkan">
            <p className="mb-2">Kami mengumpulkan data berikut:</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>
                <strong>Data akun</strong>: nama, alamat email, foto profil,
                nomor telepon (opsional), dan friend code.
              </li>
              <li>
                <strong>Data lokasi</strong>: koordinat GPS saat Anda
                menggunakan fitur Discover untuk mendapatkan rekomendasi cafe
                terdekat. Lokasi hanya diminta saat dibutuhkan dan tidak
                disimpan secara permanen tanpa persetujuan Anda.
              </li>
              <li>
                <strong>Riwayat interaksi</strong>: swipe Discover, shortlist,
                bookmark, favorit, check-in, vote, dan ulasan cafe.
              </li>
              <li>
                <strong>Data sosial</strong>: daftar teman (melalui friend
                code), notifikasi sosial.
              </li>
              <li>
                <strong>Data teknis</strong>: alamat IP, jenis perangkat,
                browser, dan log akses untuk keperluan keamanan dan debugging.
              </li>
            </ul>
          </Section>

          {/* 3 */}
          <Section title="3. Cara Kami Menggunakan Data">
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>
                Mencocokkan preferensi Anda dengan cafe yang relevan
                (matchmaking, fitur Discover).
              </li>
              <li>
                Memberikan rekomendasi personal berdasarkan riwayat interaksi.
              </li>
              <li>
                Mengirim notifikasi dalam aplikasi terkait aktivitas teman dan
                promosi (dapat dimatikan di pengaturan notifikasi).
              </li>
              <li>
                Menghasilkan laporan rekap tahunan pribadi ("CafeMatch Recap").
              </li>
              <li>
                Analitik agregat dan anonim untuk meningkatkan kualitas layanan.
              </li>
              <li>
                Menegakkan syarat & ketentuan, mencegah penyalahgunaan, dan
                memenuhi kewajiban hukum.
              </li>
            </ul>
          </Section>

          {/* 4 */}
          <Section title="4. Berbagi Data dengan Pihak Ketiga">
            <p className="mb-2">
              Kami <strong>tidak menjual</strong> data pribadi Anda kepada pihak
              ketiga. Data dibagikan hanya dalam kondisi berikut:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>
                <strong>Google Maps Platform</strong>: untuk menampilkan peta
                dan informasi lokasi cafe.
              </li>
              <li>
                <strong>Google / penyedia OAuth lain</strong>: jika Anda memilih
                login sosial, data profil dasar diterima dari penyedia tersebut
                sesuai izin yang Anda berikan.
              </li>
              <li>
                <strong>Pemilik cafe</strong>: hanya menerima data check-in
                agregat (jumlah kunjungan) tanpa informasi identitas personal
                tamu.
              </li>
              <li>
                <strong>Kewajiban hukum</strong>: kami dapat mengungkapkan data
                jika diwajibkan oleh hukum atau perintah pengadilan yang sah.
              </li>
            </ul>
          </Section>

          {/* 5 */}
          <Section title="5. Penyimpanan & Keamanan Data">
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>
                Password disimpan menggunakan bcrypt dengan salt factor 10 —
                kami tidak pernah menyimpan password dalam teks biasa.
              </li>
              <li>
                Otentikasi menggunakan JSON Web Token (JWT) berumur pendek
                dengan rotasi.
              </li>
              <li>
                Akun yang dihapus dinonaktifkan segera; data dihapus permanen
                dari server setelah <strong>30 hari</strong> masa pemulihan.
              </li>
              <li>
                Seluruh komunikasi antara aplikasi dan server dienkripsi
                menggunakan HTTPS/TLS.
              </li>
              <li>
                Kami melakukan audit keamanan berkala dan membatasi akses data
                hanya kepada tim yang membutuhkan.
              </li>
            </ul>
          </Section>

          {/* 6 */}
          <Section title="6. Hak-Hak Anda">
            <p className="mb-2">Anda memiliki hak untuk:</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>
                <strong>Akses</strong>: melihat data yang kami simpan tentang
                Anda dengan menghubungi kami.
              </li>
              <li>
                <strong>Koreksi</strong>: memperbarui nama, foto profil, dan
                informasi akun melalui halaman{" "}
                <Link to="/profile" className="text-[#D48B3A] hover:underline">
                  Edit Profil
                </Link>
                .
              </li>
              <li>
                <strong>Penghapusan</strong>: menghapus akun Anda kapan saja
                melalui halaman{" "}
                <Link to="/profile" className="text-[#D48B3A] hover:underline">
                  Profil → Hapus Akun
                </Link>{" "}
                (saat login). Tidak bisa login? Ajukan permintaan melalui{" "}
                <Link
                  to="/account-deletion"
                  className="text-[#D48B3A] hover:underline"
                >
                  halaman publik penghapusan akun
                </Link>
                . Data akan dihapus permanen setelah 30 hari.
              </li>
              <li>
                <strong>Ekspor data</strong>: mengajukan permintaan ekspor
                seluruh data Anda dengan menghubungi kami melalui email di
                bawah.
              </li>
              <li>
                <strong>Penarikan persetujuan</strong>: menghentikan pemberian
                izin lokasi atau notifikasi kapan saja melalui pengaturan
                perangkat Anda.
              </li>
            </ul>
          </Section>

          {/* 7 */}
          <Section title="7. Cookie & Pelacakan">
            <p>
              CafeMatch menggunakan localStorage untuk menyimpan token
              otentikasi secara lokal di perangkat Anda. Kami tidak menggunakan
              cookie pihak ketiga untuk iklan bertarget. Analitik dasar
              (tampilan halaman, fitur yang digunakan) dikumpulkan secara anonim
              untuk meningkatkan pengalaman pengguna.
            </p>
          </Section>

          {/* 8 */}
          <Section title="8. Anak di Bawah Umur">
            <p>
              Layanan CafeMatch ditujukan untuk pengguna berusia minimal{" "}
              <strong>13 tahun</strong> sesuai dengan Peraturan Pemerintah No.
              71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi
              Elektronik. Kami tidak secara sengaja mengumpulkan data pribadi
              anak di bawah umur. Jika Anda mengetahui adanya akun anak di bawah
              umur, harap hubungi kami segera.
            </p>
          </Section>

          {/* 9 */}
          <Section title="9. Perubahan Kebijakan">
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu.
              Perubahan signifikan akan diberitahukan melalui notifikasi dalam
              aplikasi atau email minimal 7 hari sebelum berlaku. Tanggal
              "Terakhir diperbarui" di bagian atas halaman ini mencerminkan
              versi terkini.
            </p>
          </Section>

          {/* 10 */}
          <Section title="10. Hubungi Kami">
            <p>
              Jika Anda memiliki pertanyaan, kekhawatiran, atau ingin mengajukan
              permintaan terkait data pribadi Anda, silakan hubungi tim kami:
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-white border border-[#F0EDE8] rounded-xl px-4 py-3 text-sm">
              <span className="text-base">📧</span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#D48B3A] font-semibold hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#F0EDE8] text-center text-xs text-[#A8A59C]">
          © {new Date().getFullYear()} CafeMatch. Seluruh hak dilindungi.
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#1C1C1A] mb-3">{title}</h2>
      <div className="text-sm text-[#5C5A52] leading-relaxed">{children}</div>
    </section>
  );
}
