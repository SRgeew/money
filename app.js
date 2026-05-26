// State & Data Default jika LocalStorage kosong
let state = JSON.parse(localStorage.getItem('money_pwa_state')) || {
    wallets: {
        "wallet_1": { id: "wallet_1", name: "Dompet Utama", balance: 0 },
        "wallet_2": { id: "wallet_2", name: "Tabungan", balance: 0 }
    },
    currentWallet: "wallet_1",
    transactions: []
};

let currentType = 'Pemasukan';

// Format Angka ke Rupiah yang rapi
function formatIDR(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// Format waktu komplit (Hari, Tanggal Bulan Tahun Jam)
function formatTimestamp(dateStr) {
    const d = new Date(dateStr);
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
    
    const tgl = String(d.getDate()).padStart(2, '0');
    const jam = String(d.getHours()).padStart(2, '0');
    const menit = String(d.getMinutes()).padStart(2, '0');

    return `${hari}, ${tgl} ${bulan} ${d.getFullYear()} • ${jam}:${menit}`;
}

function saveData() {
    localStorage.setItem('money_pwa_state', JSON.stringify(state));
    render();
}

// Navigasi Tipe Transaksi
function setTxType(type) {
    currentType = type;
    const btns = { 'Pemasukan': 'btnInc', 'Pengeluaran': 'btnExp', 'Transfer': 'btnTrf' };
    const colors = { 'Pemasukan': 'border-green-500 bg-green-50 text-green-600', 'Pengeluaran': 'border-red-500 bg-red-50 text-red-600', 'Transfer': 'border-blue-500 bg-blue-50 text-blue-600' };

    Object.keys(btns).forEach(k => {
        const el = document.getElementById(btns[k]);
        el.className = "py-2 text-sm font-bold rounded-lg border-2 border-transparent bg-gray-100 text-gray-500";
    });

    document.getElementById(btns[type]).className = `py-2 text-sm font-bold rounded-lg border-2 ${colors[type]}`;
    document.getElementById('transferTargetDiv').className = type === 'Transfer' ? 'block' : 'hidden';
}

// Mengubah Nama Wallet
function renameWallet() {
    const newName = prompt("Masukkan nama baru untuk wallet ini:", state.wallets[state.currentWallet].name);
    if (newName && newName.trim() !== "") {
        state.wallets[state.currentWallet].name = newName.trim();
        saveData();
    }
}

// Proses Transaksi Baru (Termasuk Transfer)
function saveTransaction() {
    const amountEl = document.getElementById('amount');
    const descEl = document.getElementById('description');
    const targetEl = document.getElementById('targetWalletSelect');
    
    const amount = parseFloat(amountEl.value);
    const desc = descEl.value.trim() || 'Tanpa keterangan';

    if (isNaN(amount) || amount <= 0) {
        alert("Harap masukkan jumlah uang yang valid!");
        return;
    }

    if (currentType === 'Pengeluaran' && amount > state.wallets[state.currentWallet].balance) {
        alert("Saldo tidak mencukupi untuk melakukan pengeluaran.");
        return;
    }

    if (currentType === 'Transfer') {
        if (state.currentWallet === targetEl.value) {
            alert("Wallet tujuan tidak boleh sama dengan wallet asal!");
            return;
        }
        if (amount > state.wallets[state.currentWallet].balance) {
            alert("Saldo tidak cukup untuk transfer.");
            return;
        }

        // Eksekusi Pemotongan dan Penambahan Saldo Transfer
        state.wallets[state.currentWallet].balance -= amount;
        state.wallets[targetEl.value].balance += amount;

        state.transactions.unshift({
            id: Date.now(),
            walletId: state.currentWallet,
            targetWalletId: targetEl.value,
            type: 'Transfer',
            amount: amount,
            desc: `Transfer ke ${state.wallets[targetEl.value].name}: ${desc}`,
            date: new Date().toISOString()
        });
    } else {
        // Pemasukan atau Pengeluaran Biasa
        if (currentType === 'Pemasukan') {
            state.wallets[state.currentWallet].balance += amount;
        } else {
            state.wallets[state.currentWallet].balance -= amount;
        }

        state.transactions.unshift({
            id: Date.now(),
            walletId: state.currentWallet,
            type: currentType,
            amount: amount,
            desc: desc,
            date: new Date().toISOString()
        });
    }

    // Reset Form Input
    amountEl.value = '';
    descEl.value = '';
    saveData();
}

function clearHistory() {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat dan mereset saldo?")) {
        state.transactions = [];
        Object.keys(state.wallets).forEach(k => state.wallets[k].balance = 0);
        saveData();
    }
}

// Render Data ke Tampilan UI
function render() {
    // Render Dropdown Pilihan Wallet
    const walletSelect = document.getElementById('walletSelect');
    const targetSelect = document.getElementById('targetWalletSelect');
    
    walletSelect.innerHTML = '';
    targetSelect.innerHTML = '';

    Object.keys(state.wallets).forEach(key => {
        const w = state.wallets[key];
        walletSelect.innerHTML += `<option value="${w.id}" ${state.currentWallet === w.id ? 'selected' : ''}>${w.name}</option>`;
        targetSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
    });

    // Tampilkan Saldo Saat ini
    const activeWallet = state.wallets[state.currentWallet];
    document.getElementById('walletBalance').innerText = formatIDR(activeWallet.balance);

    // Hitung Akumulasi In/Out khusus wallet aktif untuk chart lingkaran
    let incTotal = 0;
    let expTotal = 0;

    const filteredTx = state.transactions.filter(t => t.walletId === state.currentWallet || t.targetWalletId === state.currentWallet);
    
    filteredTx.forEach(t => {
        if (t.type === 'Pemasukan') incTotal += t.amount;
        if (t.type === 'Pengeluaran') expTotal += t.amount;
        // Kasus transfer disesuaikan status walletnya
        if (t.type === 'Transfer') {
            if (t.walletId === state.currentWallet) expTotal += t.amount; // keluar dari wallet ini
            if (t.targetWalletId === state.currentWallet) incTotal += t.amount; // masuk ke wallet ini
        }
    });

    document.getElementById('totalIncome').innerText = formatIDR(incTotal);
    document.getElementById('totalExpense').innerText = formatIDR(expTotal);

    // Logika Hitung Persentase & Render Grafik Lingkaran
    const combined = incTotal + expTotal;
    const chartEl = document.getElementById('chart');
    if (combined > 0) {
        const expPct = (expTotal / combined) * 100;
        chartEl.style.setProperty('--p-out', `${expPct}%`);
        chartEl.style.setProperty('--p-in', `100%`);
    } else {
        chartEl.style.setProperty('--p-out', `0%`);
        chartEl.style.setProperty('--p-in', `0%`);
    }

    // Render Riwayat List
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (filteredTx.length === 0) {
        historyList.innerHTML = `<div class="text-center py-8 text-sm text-gray-400 italic">Belum ada transaksi di wallet ini.</div>`;
        return;
    }

    filteredTx.forEach(t => {
        let title = t.desc;
        let amtSign = '';
        let colorClass = '';

        if (t.type === 'Pemasukan') {
            amtSign = '+';
            colorClass = 'text-green-600 bg-green-50';
        } else if (t.type === 'Pengeluaran') {
            amtSign = '-';
            colorClass = 'text-red-600 bg-red-50';
        } else if (t.type === 'Transfer') {
            if (t.walletId === state.currentWallet) {
                amtSign = '-';
                colorClass = 'text-blue-600 bg-blue-50';
            } else {
                amtSign = '+';
                title = `Menerima ${t.desc}`;
                colorClass = 'text-green-600 bg-green-50';
            }
        }

        historyList.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
                <div class="flex-1 min-w-0 pr-3">
                    <p class="text-sm font-semibold text-gray-800 truncate">${title}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">${formatTimestamp(t.date)}</p>
                </div>
                <div class="text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${colorClass}">
                    ${amtSign} ${Number(t.amount).toLocaleString('id-ID')}
                </div>
            </div>
        `;
    });
}

// Event listener saat user berganti jenis wallet di dropdown
document.getElementById('walletSelect').addEventListener('change', (e) => {
    state.currentWallet = e.target.value;
    saveData();
});

// Jalankan sistem saat pertama kali dibuka
render();
  
