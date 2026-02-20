import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

// --- Types ---
type AuthMode = 'LOGIN' | 'SIGNUP' | 'RESET_PASSWORD' | null;

interface AuthSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

// --- Sub-components (Moved outside to fix focus bug) ---

/**
 * Login View Component
 */
const LoginView: React.FC<{
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isLoading: boolean;
  onLogin: (e: React.FormEvent) => void;
  setMode: (mode: AuthMode) => void;
}> = ({ email, setEmail, password, setPassword, isLoading, onLogin, setMode }) => (
  <form onSubmit={onLogin} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <h2 className="text-3xl font-black italic text-[#EC4899] text-center mb-8 uppercase tracking-tighter">Townhub Login</h2>
    <div className="space-y-4">
      <input 
        type="email" 
        placeholder="이메일 주소" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
        required
      />
      <input 
        type="password" 
        placeholder="비밀번호" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
        required
      />
    </div>
    <div className="flex justify-end">
      <button 
        type="button" 
        onClick={() => setMode('RESET_PASSWORD')}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
      >
        비밀번호를 잊으셨나요?
      </button>
    </div>
    <button 
      type="submit"
      disabled={isLoading}
      className="w-full py-4 bg-[#EC4899] text-white rounded-[24px] font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
    >
      {isLoading ? "처리 중..." : "로그인"}
    </button>
    <div className="text-center mt-6">
      <span className="text-slate-500 text-sm">계정이 없으신가요?</span>
      <button 
        type="button"
        onClick={() => setMode('SIGNUP')} 
        className="ml-2 text-white font-bold underline text-sm hover:text-[#EC4899] transition-colors"
      >
        Register (회원가입)
      </button>
    </div>
  </form>
);

/**
 * Signup View Component
 */
const SignupView: React.FC<{
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (val: string) => void;
  nickname: string;
  setNickname: (val: string) => void;
  isEmailLinkSent: boolean;
  isEmailVerified: boolean;
  isNicknameChecked: boolean;
  agreed: { terms: boolean; privacy: boolean };
  setAgreed: (val: any) => void;
  isLoading: boolean;
  onSendLink: () => void;
  onCheckNickname: () => void;
  onSignup: (e: React.FormEvent) => void;
  setMode: (mode: AuthMode) => void;
}> = ({ 
  email, setEmail, password, setPassword, passwordConfirm, setPasswordConfirm, 
  nickname, setNickname, isEmailLinkSent, isEmailVerified, isNicknameChecked, 
  agreed, setAgreed, isLoading, onSendLink, onCheckNickname, onSignup, setMode 
}) => (
  <form onSubmit={onSignup} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
    <h2 className="text-3xl font-black italic text-[#EC4899] text-center mb-6 uppercase tracking-tighter">Townhub Join</h2>
    
    {/* Step 1: Email Verification Link */}
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          type="email" 
          placeholder="이메일 주소" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isEmailVerified || isEmailLinkSent}
          className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all disabled:opacity-50" 
          required
        />
        {!isEmailVerified && !isEmailLinkSent && (
          <button 
            type="button"
            onClick={onSendLink}
            disabled={isLoading || !email}
            className="bg-slate-700 px-4 rounded-2xl font-bold text-xs hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            인증 요청
          </button>
        )}
      </div>

      {isEmailLinkSent && !isEmailVerified && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-center animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-slate-300 leading-relaxed">
            인증 메일이 발송되었습니다.<br/>
            메일함의 링크를 클릭하여 인증을 완료해주세요.
          </p>
          <button 
            type="button" 
            onClick={onSendLink}
            className="mt-2 text-[10px] text-[#EC4899] underline hover:text-white transition-colors"
          >
            메일이 오지 않았나요? 다시 보내기
          </button>
        </div>
      )}

      {isEmailVerified && (
        <p className="text-[10px] text-emerald-500 font-bold px-2">✓ 이메일 인증이 완료되었습니다.</p>
      )}
    </div>

    {/* Step 2: Password & Nickname (Only after email verification) */}
    {isEmailVerified && (
      <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
        <div className="space-y-2">
          <input 
            type="password" 
            placeholder="비밀번호 (8자 이상)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
            required
            minLength={8}
          />
          <input 
            type="password" 
            placeholder="비밀번호 확인" 
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={`w-full bg-slate-800 border p-4 rounded-2xl outline-none text-white transition-all ${
              passwordConfirm && password !== passwordConfirm ? 'border-red-500' : 'border-slate-700 focus:border-[#EC4899]'
            }`} 
            required
          />
          {passwordConfirm && password !== passwordConfirm && (
            <p className="text-[10px] text-red-500 font-bold px-2">비밀번호가 일치하지 않습니다.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="닉네임" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
            required
          />
          <button 
            type="button"
            onClick={onCheckNickname}
            disabled={!nickname || isLoading}
            className="bg-slate-700 px-4 rounded-2xl font-bold text-xs hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            중복 확인
          </button>
        </div>
        {isNicknameChecked && (
          <p className="text-[10px] text-emerald-500 font-bold px-2">✓ 사용 가능한 닉네임입니다.</p>
        )}
      </div>
    )}

    {/* Step 3: Terms & Signup */}
    {isEmailVerified && isNicknameChecked && (
      <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
        <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={agreed.terms}
                onChange={(e) => setAgreed((prev: any) => ({...prev, terms: e.target.checked}))} 
                className="w-5 h-5 accent-[#EC4899] cursor-pointer" 
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">이용약관 동의 (필수)</span>
            </label>
            <a href="/terms.html" target="_blank" className="text-xs text-slate-500 underline hover:text-slate-300">보기</a>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={agreed.privacy}
                onChange={(e) => setAgreed((prev: any) => ({...prev, privacy: e.target.checked}))} 
                className="w-5 h-5 accent-[#EC4899] cursor-pointer" 
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">개인정보 처리방침 (필수)</span>
            </label>
            <a href="/privacy.html" target="_blank" className="text-xs text-slate-500 underline hover:text-slate-300">보기</a>
          </div>
        </div>

        <button 
          type="submit"
          disabled={!(agreed.terms && agreed.privacy) || isLoading || password !== passwordConfirm}
          className={`w-full py-5 rounded-[24px] font-black text-xl transition-all transform active:scale-95 ${
            agreed.terms && agreed.privacy && !isLoading && password === passwordConfirm
              ? 'bg-[#EC4899] text-white hover:scale-[1.02] shadow-lg shadow-pink-500/30' 
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? "가입 처리 중..." : "TOWNHUB 시작하기"}
        </button>
      </div>
    )}

    <button 
      type="button"
      onClick={() => setMode('LOGIN')} 
      className="w-full text-center text-slate-500 text-sm mt-2 hover:text-slate-300 transition-colors"
    >
      이미 계정이 있나요? 로그인
    </button>
  </form>
);

/**
 * Reset Password View Component
 */
const ResetPasswordView: React.FC<{
  email: string;
  setEmail: (val: string) => void;
  isLoading: boolean;
  onReset: (e: React.FormEvent) => void;
  setMode: (mode: AuthMode) => void;
}> = ({ email, setEmail, isLoading, onReset, setMode }) => (
  <form onSubmit={onReset} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <h2 className="text-2xl font-black italic text-[#EC4899] text-center mb-8 uppercase tracking-tighter">Reset Password</h2>
    <p className="text-slate-400 text-sm text-center mb-6">가입하신 이메일 주소를 입력하시면<br/>비밀번호 재설정 링크를 보내드립니다.</p>
    <input 
      type="email" 
      placeholder="이메일 주소" 
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
      required
    />
    <button 
      type="submit"
      disabled={isLoading || !email}
      className="w-full py-4 bg-[#EC4899] text-white rounded-[24px] font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
    >
      {isLoading ? "전송 중..." : "재설정 메일 보내기"}
    </button>
    <button 
      type="button"
      onClick={() => setMode('LOGIN')} 
      className="w-full text-center text-slate-500 text-sm mt-4 hover:text-slate-300 transition-colors"
    >
      로그인 화면으로 돌아가기
    </button>
  </form>
);

// --- Main AuthSystem Component ---

const AuthSystem: React.FC<AuthSystemProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState({ terms: false, privacy: false });
  
  // Logic States
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailLinkSent, setIsEmailLinkSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // --- Email Link Detection ---
  useEffect(() => {
    const handleEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let storedEmail = window.localStorage.getItem('emailForSignIn');
        if (!storedEmail) {
          storedEmail = window.prompt('인증을 완료하려면 이메일을 다시 입력해주세요.');
        }
        
        if (storedEmail) {
          setIsLoading(true);
          try {
            await signInWithEmailLink(auth, storedEmail, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            // Successfully signed in via link
            setEmail(storedEmail);
            setIsEmailVerified(true);
            setMode('SIGNUP');
            onSuccess("이메일 인증이 완료되었습니다. 나머지 정보를 입력해주세요.");
          } catch (error: any) {
            console.error(error);
            alert("인증 링크가 만료되었거나 유효하지 않습니다.");
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    handleEmailLink();
  }, [auth, onSuccess]);

  // Reset states when modal closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setNickname('');
      setAgreed({ terms: false, privacy: false });
      setIsEmailVerified(false);
      setIsEmailLinkSent(false);
      setIsNicknameChecked(false);
      setMode('LOGIN');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("이메일과 비밀번호를 입력해주세요.");
    
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess("로그인에 성공했습니다!");
      onClose();
    } catch (error: any) {
      console.error(error);
      let msg = "로그인에 실패했습니다.";
      if (error.code === 'auth/user-not-found') msg = "존재하지 않는 계정입니다.";
      if (error.code === 'auth/wrong-password') msg = "비밀번호가 일치하지 않습니다.";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해주세요.");
      setMode('LOGIN');
    } catch (error: any) {
      console.error(error);
      alert("이메일 발송에 실패했습니다. 주소를 다시 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLink = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      // 1. Check if email exists in Firestore
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert("이미 가입된 이메일입니다.");
        setIsLoading(false);
        return;
      }

      // 2. Send Sign-in Link
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setIsEmailLinkSent(true);
      alert("인증 메일이 발송되었습니다. 메일함의 링크를 클릭하여 인증을 완료해주세요.");
    } catch (error: any) {
      console.error(error);
      alert("이메일 발송 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckNickname = async () => {
    if (!nickname) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("nickname", "==", nickname));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert("이미 사용 중인 닉네임입니다.");
        setIsNicknameChecked(false);
      } else {
        setIsNicknameChecked(true);
        alert("사용 가능한 닉네임입니다.");
      }
    } catch (error) {
      console.error(error);
      alert("닉네임 확인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified || !isNicknameChecked) return;
    if (!agreed.terms || !agreed.privacy) return;
    if (password !== passwordConfirm) return alert("비밀번호가 일치하지 않습니다.");

    setIsLoading(true);
    try {
      // User is already signed in via Email Link
      const user = auth.currentUser;
      if (!user) throw new Error("인증 세션이 만료되었습니다. 다시 시도해주세요.");

      // 1. Set Password
      await updatePassword(user, password);

      // 2. Update Profile
      await updateProfile(user, { displayName: nickname });

      // 3. Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: email,
        nickname: nickname,
        role: 'newbie',
        createdAt: serverTimestamp()
      });

      onSuccess("TOWNHUB에 오신 것을 환영합니다! 가입이 완료되었습니다.");
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("가입 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 p-8 lg:p-12 rounded-[48px] max-w-md w-full relative shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 text-slate-500 text-2xl hover:text-white transition-colors p-2"
        >
          ✕
        </button>
        
        {mode === 'LOGIN' && (
          <LoginView 
            email={email} setEmail={setEmail} 
            password={password} setPassword={setPassword} 
            isLoading={isLoading} onLogin={handleLogin} setMode={setMode} 
          />
        )}

        {mode === 'SIGNUP' && (
          <SignupView 
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm}
            nickname={nickname} setNickname={setNickname}
            isEmailLinkSent={isEmailLinkSent}
            isEmailVerified={isEmailVerified}
            isNicknameChecked={isNicknameChecked}
            agreed={agreed} setAgreed={setAgreed}
            isLoading={isLoading}
            onSendLink={handleSendLink}
            onCheckNickname={handleCheckNickname}
            onSignup={handleSignup}
            setMode={setMode}
          />
        )}

        {mode === 'RESET_PASSWORD' && (
          <ResetPasswordView 
            email={email} setEmail={setEmail} 
            isLoading={isLoading} onReset={handleResetPassword} setMode={setMode} 
          />
        )}
      </div>
    </div>
  );
};

export default AuthSystem;
