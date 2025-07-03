import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, BarChart2, Settings, Trash2, Filter, Home, Calendar, TrendingUp } from 'lucide-react';

// TypeScript 인터페이스 정의
interface Transaction {
  id: number;
  type: '저축' | '인출' | '복리적용';
  amount: number;
  date: string;
  balanceAfter: number;
}

type ActiveTab = 'home' | 'stats' | 'settings';

const TimeBankApp = () => {
  const [totalTime, setTotalTime] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [expectedDays, setExpectedDays] = useState<string>('0');
  const [projectedTotalTime, setProjectedTotalTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // 거래 내역 필터
  const [transactionFilter, setTransactionFilter] = useState<string>('전체');
  const [dateRange, setDateRange] = useState<string>('전체기간');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    document.title = 'Time Bank';
  }, []);

  // 앱 시작 시 데이터 로드 및 복리 계산
  useEffect(() => {
    const savedData = localStorage.getItem('timeBankData');
    if (savedData) {
      const data = JSON.parse(savedData);
      let newTotalTime = data.totalTime || 0;
      let newTransactions = data.transactions || [];
      const savedInterestRate = data.interestRate !== undefined ? data.interestRate : 10;
      setInterestRate(savedInterestRate);

      const lastUpdate = data.lastUpdate ? new Date(data.lastUpdate) : new Date();
      const today = new Date();
      
      const daysPassed = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPassed > 0 && newTotalTime > 0) {
        let currentTotal = newTotalTime;
        const compoundTransactions: Transaction[] = [];
        
        for (let i = 0; i < daysPassed; i++) {
          const nextDay = new Date(lastUpdate);
          nextDay.setDate(lastUpdate.getDate() + i + 1);
          const interest = Math.floor(currentTotal * (savedInterestRate / 100));
          if (interest > 0) {
            const newBalance = currentTotal + interest;
            compoundTransactions.push({
              id: Date.now() + i,
              type: '복리적용',
              amount: interest,
              date: nextDay.toISOString().split('T')[0],
              balanceAfter: newBalance,
            });
            currentTotal = newBalance;
          }
        }

        if (compoundTransactions.length > 0) {
          newTotalTime = currentTotal;
          newTransactions = [...compoundTransactions.reverse(), ...newTransactions];
        }
      }
      
      setTotalTime(newTotalTime);
      setTransactions(newTransactions);
      saveData(newTotalTime, newTransactions, savedInterestRate);
    }
  }, []);

  // 데이터 저장
  const saveData = (newTotalTime: number, newTransactions: Transaction[], newInterestRate: number) => {
    const data = {
      totalTime: newTotalTime,
      transactions: newTransactions,
      interestRate: newInterestRate,
      lastUpdate: new Date().toISOString().split('T')[0],
    };
    localStorage.setItem('timeBankData', JSON.stringify(data));
  };

  // 예상 이자 계산 함수
  const calculateExpectedInterest = (baseTime: number, rate: number, days: number) => {
    let currentAmount = baseTime;
    for (let i = 0; i < days; i++) {
      currentAmount += Math.floor(currentAmount * (rate / 100));
    }
    return currentAmount;
  };

  // 시간 저축
  const depositTime = (minutes: number) => {
    const newTotal = totalTime + minutes;
    const newTransaction: Transaction = {
      id: Date.now(),
      type: '저축',
      amount: minutes,
      date: currentDate,
      balanceAfter: newTotal,
    };
    const newTransactions = [newTransaction, ...transactions];
    setTotalTime(newTotal);
    setTransactions(newTransactions);
    saveData(newTotal, newTransactions, interestRate);
  };

  // 시간 인출
  const withdrawTime = () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 시간을 입력해주세요.');
      return;
    }
    if (amount > totalTime) {
      alert('저축된 시간이 부족합니다.');
      return;
    }
    const newTotal = totalTime - amount;
    const newTransaction: Transaction = {
      id: Date.now(),
      type: '인출',
      amount: amount,
      date: currentDate,
      balanceAfter: newTotal,
    };
    const newTransactions = [newTransaction, ...transactions];
    setTotalTime(newTotal);
    setTransactions(newTransactions);
    setWithdrawAmount('');
    saveData(newTotal, newTransactions, interestRate);
  };
  
  // 이율 변경 핸들러
  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    if (!isNaN(newRate) && newRate >= 0) {
      setInterestRate(newRate);
      saveData(totalTime, transactions, newRate);
    }
  };

  // 데이터 초기화 핸들러
  const handleResetData = () => {
    if (window.confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('timeBankData');
      window.location.reload();
    }
  };

  // 시간을 시:분 형식으로 변환
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  // 날짜별 통계
  const getDailyStats = () => {
    const stats: { [key: string]: { deposit: number; withdraw: number; compound: number } } = {};
    transactions.forEach(t => {
      if (!stats[t.date]) {
        stats[t.date] = { deposit: 0, withdraw: 0, compound: 0 };
      }
      if (t.type === '저축') stats[t.date].deposit += t.amount;
      else if (t.type === '인출') stats[t.date].withdraw += t.amount;
      else if (t.type === '복리적용') stats[t.date].compound += t.amount;
    });
    return stats;
  };

  // 거래 내역 필터링
  const getFilteredTransactions = () => {
    let filtered = transactions;
    if (transactionFilter !== '전체') {
      filtered = filtered.filter(t => t.type === transactionFilter);
    }
    const today = new Date();
    switch (dateRange) {
      case '최근7일': {
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        filtered = filtered.filter(t => new Date(t.date) >= week);
        break;
      }
      case '최근30일': {
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        filtered = filtered.filter(t => new Date(t.date) >= month);
        break;
      }
      case '사용자지정':
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(t => t.date >= customStartDate && t.date <= customEndDate);
        }
        break;
      default:
        break;
    }
    return filtered;
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* 총 저축 시간 */}
      <div className="text-center bg-white p-6 rounded-2xl shadow-md">
        <p className="text-gray-500 text-sm">총 저축 시간</p>
        <p className="text-4xl font-extrabold mt-2 mb-1 leading-tight tracking-tighter text-gray-800">{formatTime(totalTime)}</p>
        <p className="text-blue-600 text-xs font-medium">매일 {interestRate}% 복리 적용</p>
      </div>

      {/* 시간 저축 및 인출 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 시간 저축 */}
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-green-500" />
            시간 저축
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[10, 30, 60].map(minutes => (
              <button
                key={minutes}
                onClick={() => depositTime(minutes)}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200"
              >
                {minutes}분
              </button>
            ))}
          </div>
        </div>

        {/* 시간 인출 */}
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
            <MinusCircle className="w-5 h-5 mr-2 text-red-500" />
            시간 인출
          </h2>
          <div className="flex space-x-2">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="분"
              className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-center"
            />
            <button
              onClick={withdrawTime}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold transition-colors text-xs"
            >
              인출
            </button>
          </div>
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-gray-500" />
          최근 거래 내역
        </h2>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {transactions.slice(0, 5).map(transaction => (
            <div key={transaction.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${
                    transaction.type === '저축' ? 'text-green-600' : 
                    transaction.type === '인출' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {transaction.type}
                  </span>
                  <span className="text-xs text-gray-500">{transaction.date}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  잔액: {formatTime(transaction.balanceAfter)}
                </div>
              </div>
              <div className={`text-sm font-bold ${
                transaction.type === '저축' || transaction.type === '복리적용' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === '저축' || transaction.type === '복리적용' ? '+' : '-'}{formatTime(transaction.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      {/* 날짜별 통계 */}
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-gray-500" />
          날짜별 통계
        </h2>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {Object.entries(getDailyStats())
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .slice(0, 15)
            .map(([date, stats]) => (
            <div key={date} className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-1">{date}</p>
              <div className="text-xs text-gray-500 space-y-1">
                {stats.deposit > 0 && <p className="flex justify-between"><span>저축:</span> <span className="font-medium text-green-600">+{formatTime(stats.deposit)}</span></p>}
                {stats.withdraw > 0 && <p className="flex justify-between"><span>인출:</span> <span className="font-medium text-red-600">-{formatTime(stats.withdraw)}</span></p>}
                {stats.compound > 0 && <p className="flex justify-between"><span>복리:</span> <span className="font-medium text-blue-600">+{formatTime(stats.compound)}</span></p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전체 거래 내역 */}
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-gray-500" />
          전체 거래 내역
        </h2>
        {/* 필터 */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-3 mb-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
            <Filter className="w-4 h-4" />
            <span>필터</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={transactionFilter} onChange={(e) => setTransactionFilter(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs">
              <option value="전체">전체 유형</option>
              <option value="저축">저축</option>
              <option value="인출">인출</option>
              <option value="복리적용">복리</option>
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs">
              <option value="전체기간">전체 기간</option>
              <option value="최근7일">최근 7일</option>
              <option value="최근30일">최근 30일</option>
              <option value="사용자지정">사용자 지정</option>
            </select>
          </div>
          {dateRange === '사용자지정' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs" />
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs" />
            </div>
          )}
        </div>
        {/* 리스트 */}
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {getFilteredTransactions().map(transaction => (
            <div key={transaction.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <span className={`text-sm font-bold ${
                  transaction.type === '저축' ? 'text-green-600' : 
                  transaction.type === '인출' ? 'text-red-600' : 'text-blue-600'
                }`}>{transaction.type}</span>
                <span className="text-xs text-gray-500 ml-2">{transaction.date}</span>
                <p className="text-xs text-gray-600 mt-1">잔액: {formatTime(transaction.balanceAfter)}</p>
              </div>
              <p className={`text-sm font-bold ${
                transaction.type === '저축' || transaction.type === '복리적용' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === '저축' || transaction.type === '복리적용' ? '+' : '-'}{formatTime(transaction.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3">일일 복리 이율 (%)</h2>
        <input
          type="number"
          value={interestRate}
          onChange={handleInterestRateChange}
          className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg"
          placeholder="예: 10"
        />
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3">예상 이자 계산 (일)</h2>
        <div className="flex space-x-2">
          <input
            type="number"
            value={expectedDays}
            onChange={(e) => setExpectedDays(e.target.value)}
            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg"
            placeholder="예: 30"
          />
          <button
            onClick={() => setProjectedTotalTime(calculateExpectedInterest(totalTime, interestRate, parseInt(expectedDays)))}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
          >
            계산
          </button>
        </div>
        {projectedTotalTime !== null && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md text-blue-700">
            예상 총 시간: <span className="font-semibold">{formatTime(projectedTotalTime)}</span>
          </div>
        )}
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-md">
        <h2 className="text-base font-semibold text-gray-700 mb-3">데이터 관리</h2>
        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center p-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          모든 데이터 초기화
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-gray-100 font-sans flex flex-col h-screen">
      <header className="p-4">
        <h1 className="text-xl font-bold text-gray-800">Time Bank</h1>
      </header>

      <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <footer className="bg-white shadow-t">
        <nav className="flex justify-around">
          <button onClick={() => setActiveTab('home')} className={`flex-1 p-3 text-center transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>
            <Home className="w-6 h-6 mx-auto" />
            <span className="text-xs">홈</span>
          </button>
          <button onClick={() => setActiveTab('stats')} className={`flex-1 p-3 text-center transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-500'}`}>
            <BarChart2 className="w-6 h-6 mx-auto" />
            <span className="text-xs">통계</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 p-3 text-center transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}>
            <Settings className="w-6 h-6 mx-auto" />
            <span className="text-xs">설정</span>
          </button>
        </nav>
      </footer>
    </div>
  );
};

export default TimeBankApp;
