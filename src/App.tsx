import React, { useState, useEffect } from 'react';
import { Clock, PlusCircle, MinusCircle, TrendingUp, Calendar, Coins, ChevronDown, ChevronUp, Filter, Settings, Trash2 } from 'lucide-react';

// TypeScript 인터페이스 정의
interface Transaction {
  id: number;
  type: '저축' | '인출' | '복리적용';
  amount: number;
  date: string;
  balanceAfter: number;
}

const TimeBankApp = () => {
  const [totalTime, setTotalTime] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [interestRate, setInterestRate] = useState<number>(10); // 복리 이율 (%)
  const [expectedDays, setExpectedDays] = useState<string>('0'); // 예상 이자 계산을 위한 일수
  const [projectedTotalTime, setProjectedTotalTime] = useState<number | null>(null); // 예상 이자 계산 결과 시간

  // 접기/펼치기 상태
  const [statsExpanded, setStatsExpanded] = useState<boolean>(false);
  const [historyExpanded, setHistoryExpanded] = useState<boolean>(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);

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

  const dailyStats = getDailyStats();

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

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-9 h-9 text-purple-200" />
              <h1 className="text-3xl font-extrabold tracking-tight">시간은행</h1>
            </div>
            <Coins className="w-7 h-7 text-purple-200" />
          </div>
          <div className="text-center">
            <p className="text-purple-100 text-base opacity-90">총 저축 시간</p>
            <p className="text-5xl font-extrabold mt-1 mb-2 leading-tight">{formatTime(totalTime)}</p>
            <p className="text-purple-200 text-sm opacity-80">매일 {interestRate}% 복리 적용</p>
          </div>
        </div>

        {/* 메인 기능 */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* 설정 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-gray-600" />
                설정
              </h2>
              {settingsExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />}
            </button>
            {settingsExpanded && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 border-t border-gray-200 pt-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-1">일일 복리 이율 (%)</label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={handleInterestRateChange}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder="예: 10"
                  />
                </div>
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-1">예상 이자 계산 (일)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={expectedDays}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setExpectedDays(isNaN(value) || value < 0 ? '0' : value.toString());
                      }}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                      placeholder="예: 30"
                    />
                    <button
                      onClick={() => {
                        const days = parseInt(expectedDays);
                        if (!isNaN(days) && days >= 0) {
                          setProjectedTotalTime(calculateExpectedInterest(totalTime, interestRate, days));
                        } else {
                          alert('올바른 일수를 입력해주세요.');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 ease-in-out shadow-md hover:shadow-lg"
                    >
                      계산
                    </button>
                  </div>
                  {projectedTotalTime !== null && (
                    <div className="mt-3 p-2 bg-blue-100 rounded-md text-blue-800">
                      <p>예상 총 시간: <span className="font-semibold">{formatTime(projectedTotalTime)}</span></p>
                    </div>
                  )}
                </div>
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
                  <label className="block text-sm font-medium text-red-800 mb-2">데이터 관리</label>
                  <button
                    onClick={handleResetData}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 ease-in-out"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    모든 데이터 초기화
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 시간 저축 */}
          <div className="bg-green-50 rounded-xl shadow-md overflow-hidden border border-green-200">
            <h2 className="text-lg sm:text-xl font-semibold text-green-800 mb-4 p-4 sm:p-5 bg-green-100 flex items-center">
              <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-green-600" />
              시간 저축
            </h2>
            
            <div className="grid grid-cols-3 gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
              {[10, 30, 60].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => depositTime(minutes)}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg text-base font-medium transition-colors duration-200 ease-in-out shadow-md hover:shadow-lg"
                >
                  {minutes}분
                </button>
              ))}
            </div>
          </div>

          {/* 시간 인출 */}
          <div className="bg-red-50 rounded-xl shadow-md overflow-hidden border border-red-200">
            <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-4 p-4 sm:p-5 bg-red-100 flex items-center">
              <MinusCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-red-600" />
              시간 인출
            </h2>
            
            <div className="flex space-x-3 px-4 pb-4 sm:px-5 sm:pb-5">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="인출할 시간(분)"
                className="flex-1 px-4 py-3 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={withdrawTime}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-medium transition-colors duration-200 ease-in-out shadow-md hover:shadow-lg"
              >
                인출
              </button>
            </div>
          </div>

          {/* 날짜별 통계 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-gray-600" />
                날짜별 통계
              </h2>
              {statsExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />}
            </button>
            {statsExpanded && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {Object.entries(dailyStats)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .slice(0, 10)
                    .map(([date, stats]) => (
                    <div key={date} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{date}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {stats.deposit > 0 && (
                          <div className="flex justify-between">
                            <span>저축:</span>
                            <span className="text-green-600 font-medium">+{formatTime(stats.deposit)}</span>
                          </div>
                        )}
                        {stats.withdraw > 0 && (
                          <div className="flex justify-between">
                            <span>인출:</span>
                            <span className="text-red-600 font-medium">-{formatTime(stats.withdraw)}</span>
                          </div>
                        )}
                        {stats.compound > 0 && (
                          <div className="flex justify-between">
                            <span>복리:</span>
                            <span className="text-blue-600 font-medium">+{formatTime(stats.compound)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 거래 내역 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-gray-600" />
                거래 내역 ({filteredTransactions.length}건)
              </h2>
              {historyExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />}
            </button>
            {historyExpanded && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4">
                {/* 필터 옵션 */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Filter className="w-4 h-4" />
                    <span>필터 옵션</span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">거래 유형</label>
                    <select
                      value={transactionFilter}
                      onChange={(e) => setTransactionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    >
                      <option value="전체">전체</option>
                      <option value="저축">저축</option>
                      <option value="인출">인출</option>
                      <option value="복리적용">복리적용</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">기간</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    >
                      <option value="전체기간">전체기간</option>
                      <option value="최근7일">최근 7일</option>
                      <option value="최근30일">최근 30일</option>
                      <option value="사용자지정">사용자 지정</option>
                    </select>
                  </div>
                  {dateRange === '사용자지정' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">시작일</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">종료일</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 거래 내역 리스트 */}
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      조건에 맞는 거래 내역이 없습니다.
                    </div>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <div key={transaction.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
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
                        <div className={`text-sm font-medium ${
                          transaction.type === '저축' || transaction.type === '복리적용' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === '저축' || transaction.type === '복리적용' ? '+' : '-'}{formatTime(transaction.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeBankApp;