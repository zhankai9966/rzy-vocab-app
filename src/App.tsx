import { useEffect, useState } from 'react';
import Home from './components/Home';
import LearnSession from './components/LearnSession';
import TestSession from './components/TestSession';
import Settings from './components/Settings';
import VaultSwitcher from './components/VaultSwitcher';
import BackupReminder from './components/BackupReminder';
import { Word, VaultId, LearningMode, VAULT_LABELS } from './types';
import { drawSession } from './lib/session';
import { getActiveVault, setActiveVault } from './lib/db';

type Screen = 'home' | 'learn' | 'test' | 'settings';

export default function App() {
  const [vaultId, setVaultIdState] = useState<VaultId>(getActiveVault());
  const [screen, setScreen] = useState<Screen>('home');
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<LearningMode>('learn-then-test');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setActiveVault(vaultId);
  }, [vaultId]);

  function switchVault(v: VaultId) {
    setVaultIdState(v);
    setShowSwitcher(false);
    setSessionWords([]);
    setScreen('home');
    setReloadKey(k => k + 1);
  }

  async function startLearning(selectedMode: LearningMode) {
    const words = await drawSession(vaultId, 10);
    if (words.length === 0) {
      alert('这个词库里还没有词。请先在「设置」里加载默认词包或导入自己的词包。');
      return;
    }
    setMode(selectedMode);
    setSessionWords(words);
    setScreen(selectedMode === 'test-only' ? 'test' : 'learn');
  }

  function goToTest() {
    setScreen('test');
  }

  function goHome() {
    setSessionWords([]);
    setScreen('home');
    setReloadKey(k => k + 1);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
        <header className="flex items-center justify-between mb-6">
          <button onClick={goHome} className="flex items-center gap-2 group" aria-label="首页">
            <span className="font-display text-2xl font-medium text-ink tracking-tight">
              {VAULT_LABELS[vaultId]}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSwitcher(true)}
              className="text-mute hover:text-ink text-sm transition-colors px-3 py-1.5 rounded-full border border-line/60"
            >
              切换词库
            </button>
            <button
              onClick={() => setScreen('settings')}
              className="text-mute hover:text-ink text-sm transition-colors"
              aria-label="设置"
            >
              ⚙ 设置
            </button>
          </div>
        </header>

        <BackupReminder vaultId={vaultId} reloadKey={reloadKey} />

        <main className="animate-fade-up">
          {screen === 'home' && (
            <Home key={`${vaultId}-${reloadKey}`} vaultId={vaultId} onStart={startLearning} />
          )}
          {screen === 'learn' && (
            <LearnSession words={sessionWords} onFinish={goToTest} onQuit={goHome} />
          )}
          {screen === 'test' && (
            <TestSession
              vaultId={vaultId}
              words={sessionWords}
              mode={mode}
              onFinish={goHome}
            />
          )}
          {screen === 'settings' && <Settings vaultId={vaultId} onBack={goHome} />}
        </main>
      </div>

      {showSwitcher && (
        <VaultSwitcher
          current={vaultId}
          onSelect={switchVault}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </div>
  );
}
