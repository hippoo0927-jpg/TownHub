import React, { useState, useEffect } from 'react';
import emailjs from 'emailjs-com';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  Timestamp
} from "firebase/firestore";

// --- Types ---
type AuthMode = 'LOGIN' | 'SIGNUP' | 'RESET_PASSWORD' | null;

interface AuthSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

// --- Sub-components (Defined outside to fix focus bug) ---

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
 * Signup View Component (OTP System)
 */
const SignupView: React.FC<{
  email: string;
  setEmail: (val: string) => void;
  otp: string;
  setOtp: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (val: string) => void;
  nickname: string;
  setNickname: (val: string) => void;
  isOtpSent: boolean;
  isEmailVerified: boolean;
  isNicknameChecked: boolean;
  agreed: { terms: boolean; privacy: boolean };
  setAgreed: (val: any) => void;
  isLoading: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onCheckNickname: () => void;
  onSignup: (e: React.FormEvent) => void;
  setMode: (mode: AuthMode) => void;
}> = ({ 
  email, setEmail, otp, setOtp, password, setPassword, passwordConfirm, setPasswordConfirm, 
  nickname, setNickname, isOtpSent, isEmailVerified, isNicknameChecked, 
  agreed, setAgreed, isLoading, onSendOtp, onVerifyOtp, onCheckNickname, onSignup, setMode 
}) => (
  <form onSubmit={onSignup} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
    <h2 className="text-3xl font-black italic text-[#EC4899] text-center mb-6 uppercase tracking-tighter">Townhub Join</h2>
    
    {/* Step 1: Email & OTP Request */}
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          type="email" 
          placeholder="이메일 주소" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isEmailVerified || isOtpSent}
          className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all disabled:opacity-50" 
          required
        />
        {!isEmailVerified && !isOtpSent && (
          <button 
            type="button"
            onClick={onSendOtp}
            disabled={isLoading || !email}
            className="bg-slate-700 px-4 rounded-2xl font-bold text-xs hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            인증 코드 발송
          </button>
        )}
      </div>

      {isOtpSent && !isEmailVerified && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="인증 코드 6자리" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl outline-none focus:border-[#EC4899] text-white transition-all" 
              maxLength={6}
              required
            />
            <button 
              type="button"
              onClick={onVerifyOtp}
              disabled={isLoading || otp.length !== 6}
              className="bg-[#EC4899] px-6 rounded-2xl font-bold text-xs text-white hover:bg-[#DB2777] transition-colors disabled:opacity-50"
            >
              확인
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center">메일이 오지 않았다면 스팸함을 확인해주세요.</p>
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
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState({ terms: false, privacy: false });
  
  // Logic States
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // --- Incomplete Signup Prevention (Forced Sign-out) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        // Check if user document exists in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        // If user is authenticated but no Firestore doc exists,
        // and they are NOT in the middle of the signup process (isEmailVerified is false),
        // then they are in an "incomplete" state and should be signed out.
        if (!userDoc.exists() && !isEmailVerified) {
          console.log("Incomplete signup detected. Signing out.");
          await signOut(auth);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db, isEmailVerified]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setOtp('');
      setPassword('');
      setPasswordConfirm('');
      setNickname('');
      setAgreed({ terms: false, privacy: false });
      setIsEmailVerified(false);
      setIsOtpSent(false);
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

  const handleSendOtp = async () => {
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

      // 2. Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 3. Store in Firestore verification_codes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
      await setDoc(doc(db, "verification_codes", email), {
        email,
        code,
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      // 4. Send Email via EmailJS
      const templateParams = {
        to_email: email,
        otp_code: code,
      };

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      setIsOtpSent(true);
      alert("인증 코드가 발송되었습니다. 메일을 확인해주세요.");
    } catch (error: any) {
      console.error(error);
      alert("이메일 발송 중 오류가 발생했습니다. 환경 변수 설정을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return;
    setIsLoading(true);
    try {
      const codeDoc = await getDoc(doc(db, "verification_codes", email));
      if (!codeDoc.exists()) {
        alert("인증 정보가 없습니다. 다시 발송해주세요.");
        return;
      }

      const data = codeDoc.data();
      const now = Timestamp.now();

      if (data.code === otp && data.expiresAt.toMillis() > now.toMillis()) {
        setIsEmailVerified(true);
        // Delete the code after verification
        await deleteDoc(doc(db, "verification_codes", email));
        alert("이메일 인증이 완료되었습니다.");
      } else if (data.expiresAt.toMillis() <= now.toMillis()) {
        alert("인증 코드가 만료되었습니다. 다시 발송해주세요.");
      } else {
        alert("인증 코드가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("인증 확인 중 오류가 발생했습니다.");
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
      // 1. Create User with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

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
            otp={otp} setOtp={setOtp}
            password={password} setPassword={setPassword}
            passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm}
            nickname={nickname} setNickname={setNickname}
            isOtpSent={isOtpSent}
            isEmailVerified={isEmailVerified}
            isNicknameChecked={isNicknameChecked}
            agreed={agreed} setAgreed={setAgreed}
            isLoading={isLoading}
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
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
