import unittest
from ringkas import ringkas, sederhanakan, pecah_kalimat


class TestPecahKalimat(unittest.TestCase):
    def test_kalimat_menempel_dipisah(self):
        self.assertEqual(
            pecah_kalimat("Rupiah menguat hari ini.Wali Kota hadir."),
            ["Rupiah menguat hari ini.", "Wali Kota hadir."],
        )

    def test_angka_desimal_tidak_dipisah(self):
        self.assertEqual(pecah_kalimat("Naik 0,48 persen ke Rp17.894."), ["Naik 0,48 persen ke Rp17.894."])

    def test_fragmen_terpotong_dibuang_jika_ada_kalimat_utuh(self):
        self.assertEqual(
            pecah_kalimat("Harga BBM turun hari ini. Menteri ESDM mengatakan ..."),
            ["Harga BBM turun hari ini."],
        )


class TestSederhanakan(unittest.TestCase):
    def test_kata_basa_basi_dibuang(self):
        self.assertEqual(
            sederhanakan("Adapun menteri mengatakan bahwa harga merupakan hal penting dalam rangka stabilitas."),
            "Menteri mengatakan harga adalah hal penting untuk stabilitas.",
        )

    def test_spasi_dalam_kurung_dirapikan(self):
        self.assertEqual(sederhanakan("Bupati Padang Lawas ( Palas) hadir"), "Bupati Padang Lawas (Palas) hadir")

    def test_bukan_merupakan(self):
        self.assertEqual(sederhanakan("Tanggal itu bukan merupakan hari libur"), "Tanggal itu bukan hari libur")

    def test_rupiah_dirapatkan(self):
        self.assertEqual(sederhanakan("menguat ke Rp 17.894 per dolar"), "Menguat ke Rp17.894 per dolar")

    def test_nominalisasi_jadi_kata_kerja(self):
        self.assertEqual(sederhanakan("Tim melakukan pemeriksaan gedung"), "Tim memeriksa gedung")


class TestRingkas(unittest.TestCase):
    def test_sehingga_dipecah_jadi_dua_poin(self):
        poin = ringkas(
            "Pemkot Kediri permudah layanan pajak",
            "Pemerintah Kota Kediri mempermudah layanan pajak dengan sistem non-tunai sehingga masyarakat bisa membayar pajak lewat kanal digital.Wali Kota ...",
        )
        self.assertEqual(
            poin,
            [
                "Pemerintah Kota Kediri mempermudah layanan pajak dengan sistem non-tunai.",
                "Masyarakat bisa membayar pajak lewat kanal digital.",
            ],
        )

    def test_maksimal_tiga_poin(self):
        teks = "Satu dua tiga empat. Lima enam tujuh delapan. Sembilan sepuluh sebelas. Dua belas tiga belas empat belas."
        self.assertEqual(len(ringkas("Judul lain", teks)), 3)

    def test_poin_sama_dengan_judul_dilewati(self):
        self.assertEqual(ringkas("Harga beras naik di Jakarta", "Harga beras naik di Jakarta."), [])

    def test_poin_panjang_dipotong(self):
        kata = " ".join(f"kata{i}" for i in range(40))
        poin = ringkas("Judul", kata + ".")
        self.assertLessEqual(len(poin[0].split()), 26)
        self.assertTrue(poin[0].endswith("…"))

    def test_kalimat_pancingan_klik_dibuang(self):
        self.assertEqual(
            ringkas("Judul", "Pedangdut Happy Asmara jadi aktor di film baru. Baca selengkapnya di sini yuk..."),
            ["Pedangdut Happy Asmara jadi aktor di film baru."],
        )
        self.assertEqual(
            ringkas("Judul", "Resep pentol mie dari mie instan yang renyah. Simak takaran tepung dan tipsnya di sini."),
            ["Resep pentol mie dari mie instan yang renyah."],
        )

    def test_pertanyaan_retoris_dibuang(self):
        self.assertEqual(
            ringkas("Judul", "Bosan dengan nasi putih biasa? Nasi daun jeruk mudah dibuat di rice cooker."),
            ["Nasi daun jeruk mudah dibuat di rice cooker."],
        )

    def test_fragmen_terpotong_bermakna_dipotong_di_koma(self):
        self.assertEqual(
            ringkas("Judul", "Truk digerakkan oleh solar. Kini, harganya melonjak akibat gangguan kilang, kelangkaan pasokan…"),
            ["Truk digerakkan oleh solar.", "Kini, harganya melonjak akibat gangguan kilang."],
        )

    def test_fragmen_lanjutan_pertanyaan_tidak_diselamatkan(self):
        self.assertEqual(
            ringkas("Judul", "Pernahkah pekerja belajar dari instruktur terbaik? Atau seorang ibu rumah tangga ikut kursus desain, mengerjakan proyek dari ..."),
            [],
        )

    def test_excerpt_kosong(self):
        self.assertEqual(ringkas("Judul", None), [])
        self.assertEqual(ringkas("Judul", "   "), [])


if __name__ == "__main__":
    unittest.main()
