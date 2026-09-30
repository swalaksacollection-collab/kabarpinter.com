import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Bagaimana Kabarpinter.com mengumpulkan, menggunakan, dan melindungi data pribadi pembaca dan kontributor.",
  alternates: { canonical: "/privasi" },
};

const UPDATED = "30 September 2026";

export default function Page() {
  return (
    <StaticPage title="Kebijakan Privasi">
      <p>
        <em>Terakhir diperbarui: {UPDATED}</em>
      </p>
      <p>
        Kebijakan ini menjelaskan data apa yang kami kumpulkan di Kabarpinter.com,
        untuk apa data itu dipakai, dan hak Anda atas data tersebut. Dengan
        menggunakan situs ini, Anda menyetujui praktik yang dijelaskan di bawah.
      </p>

      <h2>1. Data yang kami kumpulkan</h2>
      <p>
        <strong>Pembaca biasa</strong> tidak perlu mendaftar. Saat Anda membuka
        situs, kami memakai layanan statistik kunjungan (Vercel Web Analytics)
        untuk mengetahui halaman yang dibuka, jenis perangkat, browser, dan
        perkiraan negara. Layanan ini tidak memakai cookie pelacak dan tidak
        membangun profil pribadi Anda.
      </p>
      <p>
        <strong>Kontributor dan pakar</strong> yang mendaftar lewat halaman kontributor
        memberikan data berikut:
      </p>
      <ul>
        <li>alamat email (untuk tautan masuk sekali pakai / magic link);</li>
        <li>
          data pengajuan: nama lengkap sesuai KTP, nomor HP/WhatsApp, kota domisili,
          profesi, institusi/afiliasi, bio dan kredensial, serta tautan profil (opsional);
        </li>
        <li>foto diri (selfie) untuk verifikasi identitas;</li>
        <li>tulisan, judul, ringkasan, kategori, dan gambar yang Anda unggah.</li>
      </ul>
      <p>
        <strong>Yang tampil publik</strong> setelah pengajuan disetujui hanyalah nama
        tampilan dan bio Anda, sebagai byline di tulisan yang diterbitkan. Nama lengkap,
        nomor HP, kota, email, dan foto diri <strong>tidak pernah ditampilkan</strong> di
        situs. Foto diri disimpan di penyimpanan privat dan hanya dapat dilihat oleh Anda
        sendiri dan admin Kabarpinter.com.
      </p>
      <p>
        Server kami juga mencatat data teknis standar (alamat IP, waktu akses,
        halaman yang diminta) untuk keamanan dan pemecahan masalah.
      </p>

      <h2>2. Cookie</h2>
      <p>
        Pembaca biasa tidak diberi cookie pelacak iklan dari kami. Cookie sesi
        hanya dipakai untuk menjaga Anda tetap masuk setelah login sebagai
        kontributor atau editor, dan diperlukan agar fitur tersebut berfungsi.
      </p>

      <h2>3. Untuk apa data dipakai</h2>
      <ul>
        <li>memverifikasi identitas dan kredensial calon kontributor sebelum tulisannya tayang;</li>
        <li>menjalankan proses masuk, penulisan, peninjauan, dan penerbitan artikel;</li>
        <li>menampilkan byline penulis pada artikel yang diterbitkan;</li>
        <li>memahami penggunaan situs agar dapat kami perbaiki;</li>
        <li>menjaga keamanan dan mencegah penyalahgunaan;</li>
        <li>menghubungi Anda terkait tulisan atau akun Anda bila diperlukan.</li>
      </ul>
      <p>Kami tidak menjual data pribadi Anda.</p>

      <h2>4. Pihak ketiga yang memproses data</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — basis data, autentikasi, dan penyimpanan
          berkas (server di Singapura).
        </li>
        <li>
          <strong>Vercel</strong> — hosting situs dan statistik kunjungan.
        </li>
      </ul>
      <p>
        Karena penyedia layanan ini berada di luar Indonesia, data Anda dapat
        diproses di luar wilayah Indonesia dengan perlindungan yang setara sesuai
        ketentuan yang berlaku.
      </p>

      <h2>5. Tautan dan gambar dari sumber lain</h2>
      <p>
        Sebagian berita di situs ini dikurasi dari media lain dan menautkan ke
        situs sumbernya. Sebagian gambar dimuat langsung dari server media
        tersebut, sehingga alamat IP Anda dapat terlihat oleh server mereka.
        Setelah Anda meninggalkan Kabarpinter.com, berlaku kebijakan privasi
        situs yang bersangkutan.
      </p>

      <h2>6. Penyimpanan data</h2>
      <p>
        Data akun dan data pengajuan kontributor (termasuk foto diri) disimpan selama
        akun aktif atau selama diperlukan untuk tujuan di atas. Anda dapat meminta
        penghapusan kapan saja (lihat bagian 7).
      </p>

      <h2>7. Hak Anda</h2>
      <p>
        Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data
        Pribadi, Anda berhak untuk mengakses, memperbaiki, menarik persetujuan
        atas, dan meminta penghapusan data pribadi Anda. Kirim permintaan ke{" "}
        <a href="mailto:redaksi@kabarpinter.com">redaksi@kabarpinter.com</a>{" "}
        dengan subjek &ldquo;Permintaan Data Pribadi&rdquo;. Kami akan menanggapi
        secepatnya.
      </p>

      <h2>8. Anak-anak</h2>
      <p>
        Fitur kontributor ditujukan bagi orang dewasa. Kami tidak dengan sengaja
        mengumpulkan data pribadi anak.
      </p>

      <h2>9. Perubahan kebijakan</h2>
      <p>
        Kebijakan ini dapat diperbarui. Tanggal pembaruan terakhir selalu
        tercantum di bagian atas halaman ini.
      </p>

      <h2>10. Kontak</h2>
      <p>
        Pertanyaan tentang kebijakan ini:{" "}
        <a href="mailto:redaksi@kabarpinter.com">redaksi@kabarpinter.com</a>.
      </p>
    </StaticPage>
  );
}
