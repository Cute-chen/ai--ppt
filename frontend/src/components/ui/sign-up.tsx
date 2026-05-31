import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback, Children } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, X, AlertCircle, PartyPopper, Loader, Hash } from "lucide-react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

import type { GlobalOptions as ConfettiGlobalOptions, CreateTypes as ConfettiInstance, Options as ConfettiOptions } from "canvas-confetti"
import confetti from "canvas-confetti"
import type { StyleTemplate } from '@/types/app'
import { apiGet, withApiBase } from '@/lib/http'
import logoSvg from '@/assets/lumislide-logo.svg'
import { useNavigate } from 'react-router-dom'

type Api = { fire: (options?: ConfettiOptions) => void }

// ── Cartoon characters panel ─────────────────────────────────────────────────
interface EyeBallProps {
  size?: number
  pupilSize?: number
  maxDistance?: number
  eyeColor?: string
  pupilColor?: string
  isBlinking?: boolean
  forceLookX?: number
  forceLookY?: number
}
function EyeBall({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = 'white', pupilColor = 'black', isBlinking = false, forceLookX, forceLookY }: EyeBallProps) {
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => { setMx(e.clientX); setMy(e.clientY) }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])
  const pos = () => {
    if (!ref.current) return { x: 0, y: 0 }
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    const r = ref.current.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2)
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
    const angle = Math.atan2(dy, dx)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  }
  const p = pos()
  return (
    <div ref={ref} className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: 'hidden' }}>
      {!isBlinking && (
        <div className="rounded-full" style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${p.x}px,${p.y}px)`, transition: 'transform 0.1s ease-out' }} />
      )}
    </div>
  )
}

interface CartoonPanelProps {
  isPasswordVisible: boolean
  hasPassword: boolean
  isTyping: boolean
}
function CartoonPanel({ isPasswordVisible, hasPassword, isTyping }: CartoonPanelProps) {
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const [purpleBlink, setPurpleBlink] = useState(false)
  const [blackBlink, setBlackBlink] = useState(false)
  const [lookAtEachOther, setLookAtEachOther] = useState(false)
  const [purplePeeking, setPurplePeeking] = useState(false)
  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => { setMx(e.clientX); setMy(e.clientY) }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])

  // Blinking
  useEffect(() => {
    const schedule = (setter: (v: boolean) => void) => {
      const t = setTimeout(() => { setter(true); setTimeout(() => { setter(false); schedule(setter) }, 150) }, Math.random() * 4000 + 3000)
      return t
    }
    const t1 = schedule(setPurpleBlink)
    const t2 = schedule(setBlackBlink)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Look at each other when typing
  useEffect(() => {
    if (!isTyping) { setLookAtEachOther(false); return }
    setLookAtEachOther(true)
    const t = setTimeout(() => setLookAtEachOther(false), 800)
    return () => clearTimeout(t)
  }, [isTyping])

  // Purple peeking when password visible
  useEffect(() => {
    if (!hasPassword || !isPasswordVisible) { setPurplePeeking(false); return }
    const t = setTimeout(() => {
      setPurplePeeking(true)
      setTimeout(() => setPurplePeeking(false), 800)
    }, Math.random() * 3000 + 2000)
    return () => clearTimeout(t)
  }, [hasPassword, isPasswordVisible, purplePeeking])

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }
    const r = ref.current.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 3)
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    }
  }

  const pp = calcPos(purpleRef)
  const bp = calcPos(blackRef)
  const yp = calcPos(yellowRef)
  const op = calcPos(orangeRef)

  const hiding = hasPassword && !isPasswordVisible

  return (
    <div style={{ position: 'relative', width: 520, height: 440 }}>
      {/* Purple tall rectangle — back */}
      <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 60, width: 190,
          height: hiding ? 480 : 440,
          backgroundColor: '#6C3FF5',
          borderRadius: '10px 10px 0 0',
          zIndex: 1,
          transform: isPasswordVisible && hasPassword
            ? 'skewX(0deg)'
            : hiding
              ? `skewX(${pp.bodySkew - 12}deg) translateX(40px)`
              : `skewX(${pp.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}>
        <div className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: isPasswordVisible && hasPassword ? 22 : lookAtEachOther ? 58 : 48 + pp.faceX,
            top: isPasswordVisible && hasPassword ? 38 : lookAtEachOther ? 68 : 44 + pp.faceY,
          }}>
          <EyeBall size={20} pupilSize={8} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={purpleBlink}
            forceLookX={isPasswordVisible && hasPassword ? (purplePeeking ? 4 : -4) : lookAtEachOther ? 3 : undefined}
            forceLookY={isPasswordVisible && hasPassword ? (purplePeeking ? 5 : -4) : lookAtEachOther ? 4 : undefined} />
          <EyeBall size={20} pupilSize={8} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={purpleBlink}
            forceLookX={isPasswordVisible && hasPassword ? (purplePeeking ? 4 : -4) : lookAtEachOther ? 3 : undefined}
            forceLookY={isPasswordVisible && hasPassword ? (purplePeeking ? 5 : -4) : lookAtEachOther ? 4 : undefined} />
        </div>
      </div>

      {/* Black tall rectangle — middle */}
      <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 230, width: 130, height: 340,
          backgroundColor: '#2D2D2D',
          borderRadius: '8px 8px 0 0',
          zIndex: 2,
          transform: isPasswordVisible && hasPassword
            ? 'skewX(0deg)'
            : lookAtEachOther
              ? `skewX(${bp.bodySkew * 1.5 + 10}deg) translateX(20px)`
              : hiding
                ? `skewX(${bp.bodySkew * 1.5}deg)`
                : `skewX(${bp.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}>
        <div className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: isPasswordVisible && hasPassword ? 12 : lookAtEachOther ? 34 : 28 + bp.faceX,
            top: isPasswordVisible && hasPassword ? 30 : lookAtEachOther ? 14 : 34 + bp.faceY,
          }}>
          <EyeBall size={18} pupilSize={7} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={blackBlink}
            forceLookX={isPasswordVisible && hasPassword ? -4 : lookAtEachOther ? 0 : undefined}
            forceLookY={isPasswordVisible && hasPassword ? -4 : lookAtEachOther ? -4 : undefined} />
          <EyeBall size={18} pupilSize={7} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={blackBlink}
            forceLookX={isPasswordVisible && hasPassword ? -4 : lookAtEachOther ? 0 : undefined}
            forceLookY={isPasswordVisible && hasPassword ? -4 : lookAtEachOther ? -4 : undefined} />
        </div>
      </div>

      {/* Orange semi-circle — front left */}
      <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 0, width: 250, height: 220,
          backgroundColor: '#FF9B6B',
          borderRadius: '125px 125px 0 0',
          zIndex: 3,
          transform: isPasswordVisible && hasPassword ? 'skewX(0deg)' : `skewX(${op.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}>
        <div className="absolute flex gap-9 transition-all duration-200 ease-out"
          style={{
            left: isPasswordVisible && hasPassword ? 54 : 88 + op.faceX,
            top: isPasswordVisible && hasPassword ? 92 : 98 + op.faceY,
          }}>
          {[0, 1].map(i => (
            <div key={i} className="rounded-full" style={{ width: 13, height: 13, backgroundColor: '#2D2D2D',
              transform: isPasswordVisible && hasPassword ? 'translate(-5px,-4px)' : undefined,
              transition: 'transform 0.1s ease-out' }} />
          ))}
        </div>
      </div>

      {/* Yellow rounded rectangle — front right */}
      <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 300, width: 150, height: 250,
          backgroundColor: '#E8D754',
          borderRadius: '75px 75px 0 0',
          zIndex: 4,
          transform: isPasswordVisible && hasPassword ? 'skewX(0deg)' : `skewX(${yp.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}>
        <div className="absolute flex gap-7 transition-all duration-200 ease-out"
          style={{
            left: isPasswordVisible && hasPassword ? 22 : 56 + yp.faceX,
            top: isPasswordVisible && hasPassword ? 38 : 44 + yp.faceY,
          }}>
          {[0, 1].map(i => (
            <div key={i} className="rounded-full" style={{ width: 13, height: 13, backgroundColor: '#2D2D2D',
              transform: isPasswordVisible && hasPassword ? 'translate(-5px,-4px)' : undefined,
              transition: 'transform 0.1s ease-out' }} />
          ))}
        </div>
        {/* Mouth */}
        <div className="absolute rounded-full transition-all duration-200 ease-out"
          style={{
            width: 86, height: 4, backgroundColor: '#2D2D2D',
            left: isPasswordVisible && hasPassword ? 12 : 44 + yp.faceX,
            top: isPasswordVisible && hasPassword ? 96 : 96 + yp.faceY,
          }} />
      </div>
    </div>
  )
}
export type ConfettiRef = Api | null

const Confetti = forwardRef<ConfettiRef, React.ComponentPropsWithRef<"canvas"> & { options?: ConfettiOptions; globalOptions?: ConfettiGlobalOptions; manualstart?: boolean }>((props, ref) => {
  const { options, globalOptions = { resize: true, useWorker: true }, manualstart = false, ...rest } = props
  const instanceRef = useRef<ConfettiInstance | null>(null)
  const canvasRef = useCallback((node: HTMLCanvasElement) => {
    if (node !== null) {
      if (instanceRef.current) return
      instanceRef.current = confetti.create(node, { ...globalOptions, resize: true })
    } else {
      if (instanceRef.current) {
        instanceRef.current.reset()
        instanceRef.current = null
      }
    }
  }, [globalOptions])
  const fire = useCallback((opts = {}) => instanceRef.current?.({ ...options, ...opts }), [options])
  const api = useMemo(() => ({ fire }), [fire])
  useImperativeHandle(ref, () => api, [api])
  useEffect(() => { if (!manualstart) fire() }, [manualstart, fire])
  return <canvas ref={canvasRef} {...rest} />
})
Confetti.displayName = "Confetti";

// --- TEXT LOOP ANIMATION COMPONENT ---
type TextLoopProps = { children: React.ReactNode[]; className?: string; interval?: number; transition?: Transition; variants?: Variants; onIndexChange?: (index: number) => void; stopOnEnd?: boolean; };
export function TextLoop({ children, className, interval = 2, transition = { duration: 0.3 }, variants, onIndexChange, stopOnEnd = false }: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);
  useEffect(() => {
    const intervalMs = interval * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer);
          return current;
        }
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, stopOnEnd]);
  const motionVariants: Variants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };
  return (
    <div className={cn('relative inline-block whitespace-nowrap', className)}>
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.div key={currentIndex} initial='initial' animate='animate' exit='exit' transition={transition} variants={variants || motionVariants}>
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- BUILT-IN BLUR FADE ANIMATION COMPONENT ---
interface BlurFadeProps { children: React.ReactNode; className?: string; variant?: { hidden: { y: number }; visible: { y: number } }; duration?: number; delay?: number; yOffset?: number; inView?: boolean; inViewMargin?: string; blur?: string; }
function BlurFade({ children, className, variant, duration = 0.4, delay = 0, yOffset = 6, inView = true, blur = "6px" }: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true });
  const isInView = !inView || inViewResult;
  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  };
  const combinedVariants = variant || defaultVariants;
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} exit="hidden" variants={combinedVariants} transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}


// --- BUILT-IN GLASS BUTTON COMPONENT (WITH CLICK FIX) ---
const glassButtonVariants = cva("relative isolate all-unset cursor-pointer rounded-full transition-all", { variants: { size: { default: "text-base font-medium", sm: "text-sm font-medium", lg: "text-lg font-medium", icon: "h-10 w-10" } }, defaultVariants: { size: "default" } });
const glassButtonTextVariants = cva("glass-button-text relative block select-none tracking-tighter", { variants: { size: { default: "px-6 py-3.5", sm: "px-4 py-2", lg: "px-8 py-4", icon: "flex h-10 w-10 items-center justify-center" } }, defaultVariants: { size: "default" } });
export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof glassButtonVariants> { contentClassName?: string; }
const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, onClick, ...props }, ref) => {
    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const button = e.currentTarget.querySelector('button');
      if (!button) {
        return;
      }
      const target = e.target as Node | null;
      // Forward click only when user clicks wrapper area outside the real button.
      if (!target || !button.contains(target)) {
        button.click();
      }
    };
    return (
      <div className={cn("glass-button-wrap cursor-pointer rounded-full relative", className)} onClick={handleWrapperClick}>
        <button className={cn("glass-button relative z-10", glassButtonVariants({ size }))} ref={ref} onClick={onClick} {...props}>
          <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>{children}</span>
        </button>
        <div className="glass-button-shadow rounded-full pointer-events-none"></div>
      </div>
    );
  }
);
GlassButton.displayName = "GlassButton";


// --- THEME-AWARE SVG GRADIENT BACKGROUND WITH SUBTLE ANIMATION ---
const GradientBackground = () => (
    <>
        <style>
            {` @keyframes float1 { 0% { transform: translate(0, 0); } 50% { transform: translate(-10px, 10px); } 100% { transform: translate(0, 0); } } @keyframes float2 { 0% { transform: translate(0, 0); } 50% { transform: translate(10px, -10px); } 100% { transform: translate(0, 0); } } `}
        </style>
        <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="absolute top-0 left-0 w-full h-full">
            <defs>
                <linearGradient id="rev_grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor: 'var(--color-primary)', stopOpacity:0.8}} /><stop offset="100%" style={{stopColor: 'var(--color-chart-3)', stopOpacity:0.6}} /></linearGradient>
                <linearGradient id="rev_grad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor: 'var(--color-chart-4)', stopOpacity:0.9}} /><stop offset="50%" style={{stopColor: 'var(--color-secondary)', stopOpacity:0.7}} /><stop offset="100%" style={{stopColor: 'var(--color-chart-1)', stopOpacity:0.6}} /></linearGradient>
                <radialGradient id="rev_grad3" cx="50%" cy="50%" r="50%"><stop offset="0%" style={{stopColor: 'var(--color-destructive)', stopOpacity:0.8}} /><stop offset="100%" style={{stopColor: 'var(--color-chart-5)', stopOpacity:0.4}} /></radialGradient>
                <filter id="rev_blur1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="35"/></filter>
                <filter id="rev_blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="25"/></filter>
                <filter id="rev_blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
            </defs>
            <g style={{ animation: 'float1 20s ease-in-out infinite' }}>
                <ellipse cx="200" cy="500" rx="250" ry="180" fill="url(#rev_grad1)" filter="url(#rev_blur1)" transform="rotate(-30 200 500)"/>
                <rect x="500" y="100" width="300" height="250" rx="80" fill="url(#rev_grad2)" filter="url(#rev_blur2)" transform="rotate(15 650 225)"/>
            </g>
            <g style={{ animation: 'float2 25s ease-in-out infinite' }}>
                <circle cx="650" cy="450" r="150" fill="url(#rev_grad3)" filter="url(#rev_blur3)" opacity="0.7"/>
                <ellipse cx="50" cy="150" rx="180" ry="120" fill="var(--color-accent)" filter="url(#rev_blur2)" opacity="0.8"/>
            </g>
        </svg>
    </>
);


// --- CHILD COMPONENTS ---

const modalSteps = [
    { message: "Signing you up...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Onboarding you...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Finalizing...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Welcome Aboard!", icon: <PartyPopper className="w-12 h-12 text-green-500" /> }
];
const TEXT_LOOP_INTERVAL = 1.5;

// --- MAIN COMPONENT ---
interface AuthComponentProps {
  pageMode?: 'login' | 'register' | 'verify' | 'reset';
  initialEmail?: string;
  initialPassword?: string;
  rememberPassword?: boolean;
  onBack?: () => void;
  onEmailSubmit?: (email: string) => Promise<void | boolean> | void | boolean;
  onPasswordChange?: (password: string) => void;
  onPasswordSubmit?: (password: string) => Promise<void> | void;
  onLoginSubmit?: (payload: { email: string; password: string }) => Promise<void> | void;
  onFinalSubmit?: (payload: {
    email: string;
    password: string;
    confirmPassword: string;
    code?: string;
    newPassword?: string;
  }) => Promise<void> | void;
  onForgotClick?: () => void;
  onSwitchAuthMode?: () => void;
  onEmailChange?: (email: string) => void;
  onCodeChange?: (code: string) => void;
  onRememberPasswordChange?: (checked: boolean) => void;
  secondaryActionText?: string;
  secondaryActionDisabled?: boolean;
  completeAtPasswordStep?: boolean;
}

export const AuthComponent = ({
  pageMode = "register",
  initialEmail = '',
  initialPassword = '',
  rememberPassword = false,
  onBack,
  onEmailSubmit,
  onPasswordChange,
  onPasswordSubmit,
  onLoginSubmit,
  onFinalSubmit,
  onForgotClick,
  onSwitchAuthMode,
  onEmailChange,
  onCodeChange,
  onRememberPasswordChange,
  secondaryActionText,
  secondaryActionDisabled = false,
  completeAtPasswordStep = false,
}: AuthComponentProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inlineConfirmPassword, setInlineConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showInlineConfirmPassword, setShowInlineConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState("email");
  const [modalStatus, setModalStatus] = useState<'closed' | 'loading' | 'error' | 'success'>('closed');
  const [modalErrorMessage, setModalErrorMessage] = useState('');
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const confettiRef = useRef<ConfettiRef>(null);

  const isLoginMode = pageMode === 'login'
  const isCodeMode = pageMode === 'verify' || pageMode === 'reset'
  const isResetMode = pageMode === 'reset'
  const showTwoFieldLogin = isLoginMode

  const isEmailValid = isCodeMode ? email.trim().length > 0 : /\S+@\S+\.\S+/.test(email);
  const isCodeInputStep = isCodeMode && authStep === 'password'
  const isCodeFieldStep = isCodeInputStep
  const isCodeValueValid = /^\d{6}$/.test(password)
  const isInlineCredentialStep = isCodeMode && authStep === 'password'
  const isInlinePasswordValid = confirmPassword.length >= 6
  const isInlineConfirmPasswordValid = inlineConfirmPassword.length >= 6
  const isInlinePasswordMatch = confirmPassword === inlineConfirmPassword
  const isPasswordValid = isCodeFieldStep ? isCodeValueValid : password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  
  const fireSideCanons = () => {
    const fire = confettiRef.current?.fire;
    if (fire) {
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
        const particleCount = 50;
        fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 60 });
        fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 120 });
    }
  };

  const pageEntryTitle = isLoginMode ? '登录' : (isResetMode ? '忘记密码' : '注册')
  const emailPlaceholder = 'Email'
  const passwordPlaceholder = isCodeMode ? 'Code' : 'Password'
  const confirmPlaceholder = isCodeMode ? 'Password' : 'Confirm Password'
  const mismatchMessage = '两次输入的密码不一致'
  const secondaryButtonText = secondaryActionText ?? (isLoginMode ? '忘记密码' : (isCodeMode ? '重新发送验证码' : '返回'))

  const submitCodeAndPasswordBundle = () => {
    if (!isCodeValueValid) {
      return
    }
    if (!isInlinePasswordValid || !isInlineConfirmPasswordValid) {
      setModalErrorMessage("密码长度至少为 6 位");
      setModalStatus('error');
      return
    }
    if (!isInlinePasswordMatch) {
      setModalErrorMessage(mismatchMessage);
      setModalStatus('error');
      return
    }
    void onFinalSubmit?.({
      email: email.trim(),
      password: confirmPassword,
      confirmPassword: inlineConfirmPassword,
      code: password,
      newPassword: confirmPassword,
    })
  }

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode || modalStatus !== 'closed' || authStep !== 'confirmPassword') return;

    if (isCodeMode) {
        if (!isConfirmPasswordValid) {
            setModalErrorMessage("密码长度至少为 6 位");
            setModalStatus('error');
            return;
        }
        void onFinalSubmit?.({
          email: email.trim(),
          password: confirmPassword,
          confirmPassword,
          code: password,
          newPassword: confirmPassword,
        });
    } else {
      if (password !== confirmPassword) {
          setModalErrorMessage(mismatchMessage);
          setModalStatus('error');
          return;
      }
      void onFinalSubmit?.({ email: email.trim(), password, confirmPassword });
    }

    setModalStatus('loading');
    const loadingStepsCount = modalSteps.length - 1;
    const totalDuration = loadingStepsCount * TEXT_LOOP_INTERVAL * 1000;
    setTimeout(() => {
        fireSideCanons();
        setModalStatus('success');
    }, totalDuration);
  };

  const handleProgressStep = async () => {
    if (showTwoFieldLogin) {
      if (!isEmailValid || !isPasswordValid) {
        return
      }
      void Promise.resolve(
        onLoginSubmit?.({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      ).catch((error) => {
        const text = error instanceof Error ? error.message : '操作失败'
        setModalErrorMessage(text)
        setModalStatus('error')
      })
      return
    }

    if (authStep === 'email') {
      if (isEmailValid) {
        const shouldContinue = await Promise.resolve(onEmailSubmit?.(email.trim()))
        if (shouldContinue === false) {
          return
        }
        setAuthStep("password");
      }
    } else if (authStep === 'password') {
        if (isInlineCredentialStep) {
          submitCodeAndPasswordBundle()
          return
        }
        if (isPasswordValid) {
          if (completeAtPasswordStep) {
            void onFinalSubmit?.({
              email: email.trim(),
              password,
              confirmPassword: password,
              code: password,
              newPassword: password,
            })
            return
          }
          void onPasswordSubmit?.(password);
          setAuthStep("confirmPassword");
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        void handleProgressStep();
    }
  };

  const handleGoBack = () => {
    if (authStep === 'confirmPassword') {
        setAuthStep('password');
        setConfirmPassword('');
        setInlineConfirmPassword('');
    }
    else if (authStep === 'password') {
      setAuthStep('email');
      setConfirmPassword('');
      setInlineConfirmPassword('');
    }
  };

  const closeModal = () => {
    setModalStatus('closed');
    setModalErrorMessage('');
  };

useEffect(() => {
    if (showTwoFieldLogin) {
      setTimeout(() => passwordInputRef.current?.focus(), 500);
      return
    }
    if (authStep === 'password') setTimeout(() => passwordInputRef.current?.focus(), 500);
    else if (authStep === 'confirmPassword') setTimeout(() => confirmPasswordInputRef.current?.focus(), 500);
}, [authStep, showTwoFieldLogin]);

useEffect(() => {
    if (modalStatus === 'success') {
        fireSideCanons();
    }
}, [modalStatus]);

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    setPassword(initialPassword)
  }, [initialPassword])

  useEffect(() => {
    let cancelled = false

    async function loadGalleryImages() {
      try {
        const data = await apiGet<StyleTemplate[]>('/api/styles')
        if (cancelled) {
          return
        }
        const images = data
          .filter((item) => item.previewUrl)
          .map((item) => withApiBase(item.previewUrl))
          .slice(0, 18)
        setGalleryImages(images)
      } catch {
        if (!cancelled) {
          setGalleryImages([])
        }
      }
    }

    void loadGalleryImages()
    return () => {
      cancelled = true
    }
  }, [])
  
  const navigate = useNavigate()

  const pageLabel = isLoginMode ? '登录' : isResetMode ? '重置密码' : '注册'
  const brandFeatures = [
    '上传 PDF / Word / 文本素材',
    'AI 自动分析内容，规划结构',
    '30+ 专业模板，一键套用',
    '对话式编辑，导出 PPTX',
  ]

  return (
    <div
      className="min-h-screen w-screen flex"
      style={{ fontFamily: "'PingFang SC', 'SF Pro Text', 'Noto Sans SC', sans-serif" }}
    >
      <style>{`
            input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { display: none !important; } input[type="password"]::-webkit-credentials-auto-fill-button, input[type="password"]::-webkit-strong-password-auto-fill-button { display: none !important; } input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active { -webkit-box-shadow: 0 0 0 30px transparent inset !important; -webkit-text-fill-color: var(--foreground) !important; background-color: transparent !important; background-clip: content-box !important; transition: background-color 5000s ease-in-out 0s !important; color: var(--foreground) !important; caret-color: var(--foreground) !important; } input:autofill { background-color: transparent !important; background-clip: content-box !important; -webkit-text-fill-color: var(--foreground) !important; color: var(--foreground) !important; } input:-internal-autofill-selected { background-color: transparent !important; background-image: none !important; color: var(--foreground) !important; -webkit-text-fill-color: var(--foreground) !important; } input:-webkit-autofill::first-line { color: var(--foreground) !important; -webkit-text-fill-color: var(--foreground) !important; }
            @property --angle-1 { syntax: "<angle>"; inherits: false; initial-value: -75deg; } @property --angle-2 { syntax: "<angle>"; inherits: false; initial-value: -45deg; }
            .glass-button-wrap { --anim-time: 400ms; --anim-ease: cubic-bezier(0.25, 1, 0.5, 1); --border-width: clamp(1px, 0.0625em, 4px); position: relative; z-index: 2; transform-style: preserve-3d; transition: transform var(--anim-time) var(--anim-ease); } .glass-button-wrap:has(.glass-button:active) { transform: rotateX(25deg); } .glass-button-shadow { --shadow-cutoff-fix: 2em; position: absolute; width: calc(100% + var(--shadow-cutoff-fix)); height: calc(100% + var(--shadow-cutoff-fix)); top: calc(0% - var(--shadow-cutoff-fix) / 2); left: calc(0% - var(--shadow-cutoff-fix) / 2); filter: blur(clamp(2px, 0.125em, 12px)); transition: filter var(--anim-time) var(--anim-ease); pointer-events: none; z-index: 0; } .glass-button-shadow::after { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: linear-gradient(180deg, oklch(from var(--foreground) l c h / 20%), oklch(from var(--foreground) l c h / 10%)); width: calc(100% - var(--shadow-cutoff-fix) - 0.25em); height: calc(100% - var(--shadow-cutoff-fix) - 0.25em); top: calc(var(--shadow-cutoff-fix) - 0.5em); left: calc(var(--shadow-cutoff-fix) - 0.875em); padding: 0.125em; box-sizing: border-box; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; transition: all var(--anim-time) var(--anim-ease); opacity: 1; }
            .glass-button { -webkit-tap-highlight-color: transparent; backdrop-filter: blur(clamp(1px, 0.125em, 4px)); transition: all var(--anim-time) var(--anim-ease); background: linear-gradient(-75deg, oklch(from var(--background) l c h / 5%), oklch(from var(--background) l c h / 20%), oklch(from var(--background) l c h / 5%)); box-shadow: inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%), inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%), 0 0.25em 0.125em -0.125em oklch(from var(--foreground) l c h / 20%), 0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 20%), 0 0 0 0 oklch(from var(--background) l c h); } .glass-button:hover { transform: scale(0.975); backdrop-filter: blur(0.01em); box-shadow: inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%), inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%), 0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 25%), 0 0 0.05em 0.1em inset oklch(from var(--background) l c h / 50%), 0 0 0 0 oklch(from var(--background) l c h); } .glass-button-text { color: oklch(from var(--foreground) l c h / 90%); text-shadow: 0em 0.25em 0.05em oklch(from var(--foreground) l c h / 10%); transition: all var(--anim-time) var(--anim-ease); } .glass-button:hover .glass-button-text { text-shadow: 0.025em 0.025em 0.025em oklch(from var(--foreground) l c h / 12%); } .glass-button-text::after { content: ""; display: block; position: absolute; width: calc(100% - var(--border-width)); height: calc(100% - var(--border-width)); top: calc(0% + var(--border-width) / 2); left: calc(0% + var(--border-width) / 2); box-sizing: border-box; border-radius: 9999px; overflow: clip; background: linear-gradient(var(--angle-2), transparent 0%, oklch(from var(--background) l c h / 50%) 40% 50%, transparent 55%); z-index: 3; mix-blend-mode: screen; pointer-events: none; background-size: 200% 200%; background-position: 0% 50%; transition: background-position calc(var(--anim-time) * 1.25) var(--anim-ease), --angle-2 calc(var(--anim-time) * 1.25) var(--anim-ease); } .glass-button:hover .glass-button-text::after { background-position: 25% 50%; } .glass-button:active .glass-button-text::after { background-position: 50% 15%; --angle-2: -15deg; } .glass-button::after { content: ""; position: absolute; z-index: 1; inset: 0; border-radius: 9999px; width: calc(100% + var(--border-width)); height: calc(100% + var(--border-width)); top: calc(0% - var(--border-width) / 2); left: calc(0% - var(--border-width) / 2); padding: var(--border-width); box-sizing: border-box; background: conic-gradient(from var(--angle-1) at 50% 50%, oklch(from var(--foreground) l c h / 50%) 0%, transparent 5% 40%, oklch(from var(--foreground) l c h / 50%) 50%, transparent 60% 95%, oklch(from var(--foreground) l c h / 50%) 100%), linear-gradient(180deg, oklch(from var(--background) l c h / 50%), oklch(from var(--background) l c h / 50%)); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; transition: all var(--anim-time) var(--anim-ease), --angle-1 500ms ease; box-shadow: inset 0 0 0 calc(var(--border-width) / 2) oklch(from var(--background) l c h / 50%); pointer-events: none; } .glass-button:hover::after { --angle-1: -125deg; } .glass-button:active::after { --angle-1: -75deg; } .glass-button-wrap:has(.glass-button:hover) .glass-button-shadow { filter: blur(clamp(2px, 0.0625em, 6px)); } .glass-button-wrap:has(.glass-button:hover) .glass-button-shadow::after { top: calc(var(--shadow-cutoff-fix) - 0.875em); opacity: 1; } .glass-button-wrap:has(.glass-button:active) .glass-button-shadow { filter: blur(clamp(2px, 0.125em, 12px)); } .glass-button-wrap:has(.glass-button:active) .glass-button-shadow::after { top: calc(var(--shadow-cutoff-fix) - 0.5em); opacity: 0.75; } .glass-button-wrap:has(.glass-button:active) .glass-button-text { text-shadow: 0.025em 0.25em 0.05em oklch(from var(--foreground) l c h / 12%); } .glass-button-wrap:has(.glass-button:active) .glass-button { box-shadow: inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%), inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%), 0 0.125em 0.125em -0.125em oklch(from var(--foreground) l c h / 20%), 0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 20%), 0 0.225em 0.05em 0 oklch(from var(--foreground) l c h / 5%), 0 0.25em 0 0 oklch(from var(--background) l c h / 75%), inset 0 0.25em 0.05em 0 oklch(from var(--foreground) l c h / 15%); } @media (hover: none) and (pointer: coarse) { .glass-button::after, .glass-button:hover::after, .glass-button:active::after { --angle-1: -75deg; } .glass-button .glass-button-text::after, .glass-button:active .glass-button-text::after { --angle-2: -45deg; } }
            .glass-input-wrap { position: relative; z-index: 2; transform-style: preserve-3d; border-radius: 9999px; } .glass-input { display: flex; position: relative; width: 100%; align-items: center; gap: 0.5rem; border-radius: 9999px; padding: 0.25rem; -webkit-tap-highlight-color: transparent; backdrop-filter: blur(clamp(1px, 0.125em, 4px)); transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1); background: linear-gradient(-75deg, oklch(from var(--background) l c h / 5%), oklch(from var(--background) l c h / 20%), oklch(from var(--background) l c h / 5%)); box-shadow: inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%), inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%), 0 0.25em 0.125em -0.125em oklch(from var(--foreground) l c h / 20%), 0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 20%), 0 0 0 0 oklch(from var(--background) l c h); } .glass-input-wrap:focus-within .glass-input { backdrop-filter: blur(0.01em); box-shadow: inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%), inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%), 0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 25%), 0 0 0.05em 0.1em inset oklch(from var(--background) l c h / 50%), 0 0 0 0 oklch(from var(--background) l c h); } .glass-input::after { content: ""; position: absolute; z-index: 1; inset: 0; border-radius: 9999px; width: calc(100% + clamp(1px, 0.0625em, 4px)); height: calc(100% + clamp(1px, 0.0625em, 4px)); top: calc(0% - clamp(1px, 0.0625em, 4px) / 2); left: calc(0% - clamp(1px, 0.0625em, 4px) / 2); padding: clamp(1px, 0.0625em, 4px); box-sizing: border-box; background: conic-gradient(from var(--angle-1) at 50% 50%, oklch(from var(--foreground) l c h / 50%) 0%, transparent 5% 40%, oklch(from var(--foreground) l c h / 50%) 50%, transparent 60% 95%, oklch(from var(--foreground) l c h / 50%) 100%), linear-gradient(180deg, oklch(from var(--background) l c h / 50%), oklch(from var(--background) l c h / 50%)); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1), --angle-1 500ms ease; box-shadow: inset 0 0 0 calc(clamp(1px, 0.0625em, 4px) / 2) oklch(from var(--background) l c h / 50%); pointer-events: none; } .glass-input-wrap:focus-within .glass-input::after { --angle-1: -125deg; } .glass-input-text-area { position: absolute; inset: 0; border-radius: 9999px; pointer-events: none; } .glass-input-text-area::after { content: ""; display: block; position: absolute; width: calc(100% - clamp(1px, 0.0625em, 4px)); height: calc(100% - clamp(1px, 0.0625em, 4px)); top: calc(0% + clamp(1px, 0.0625em, 4px) / 2); left: calc(0% + clamp(1px, 0.0625em, 4px) / 2); box-sizing: border-box; border-radius: 9999px; overflow: clip; background: linear-gradient(var(--angle-2), transparent 0%, oklch(from var(--background) l c h / 50%) 40% 50%, transparent 55%); z-index: 3; mix-blend-mode: screen; pointer-events: none; background-size: 200% 200%; background-position: 0% 50%; transition: background-position calc(400ms * 1.25) cubic-bezier(0.25, 1, 0.5, 1), --angle-2 calc(400ms * 1.25) cubic-bezier(0.25, 1, 0.5, 1); } .glass-input-wrap:focus-within .glass-input-text-area::after { background-position: 25% 50%; }
        `}</style>

        <Confetti ref={confettiRef} manualstart className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" />
        <AnimatePresence>
            {modalStatus !== 'closed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-card/80 border-4 border-border rounded-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4 mx-2">
                        {(modalStatus === 'error' || modalStatus === 'success') && <button onClick={closeModal} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>}
                        {modalStatus === 'error' && <>
                            <AlertCircle className="w-12 h-12 text-destructive" />
                            <p className="text-lg font-medium text-foreground">{modalErrorMessage}</p>
                            <GlassButton onClick={closeModal} size="sm" className="mt-4">重试</GlassButton>
                        </>}
                        {modalStatus === 'loading' &&
                            <TextLoop interval={TEXT_LOOP_INTERVAL} stopOnEnd={true}>
                                {modalSteps.slice(0, -1).map((step, i) =>
                                    <div key={i} className="flex flex-col items-center gap-4">
                                        {step.icon}
                                        <p className="text-lg font-medium text-foreground">{step.message}</p>
                                    </div>
                                )}
                            </TextLoop>
                        }
                        {modalStatus === 'success' &&
                            <div className="flex flex-col items-center gap-4">
                                {modalSteps[modalSteps.length - 1].icon}
                                <p className="text-lg font-medium text-foreground">{modalSteps[modalSteps.length - 1].message}</p>
                            </div>
                        }
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* ── Left cartoon panel ── */}
        <div
          className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #103c9f 0%, #2659c8 42%, #2f6de3 100%)',
          }}
        >
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-15" style={{ background: 'white' }} />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-10" style={{ background: 'white' }} />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(60px)' }} />

          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="relative z-10 flex items-center gap-2.5 cursor-pointer w-fit"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <img src={logoSvg} alt="Lumislide" style={{ width: 36, height: 36 }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(246,251,255,0.95)', letterSpacing: '-0.02em' }}>
              Lumislide
            </span>
          </button>

          {/* Characters — flex-1 so they fill the middle space */}
          <div className="relative z-10 flex flex-1 items-end justify-center py-6">
            <CartoonPanel
              isPasswordVisible={showPassword}
              hasPassword={password.length > 0}
              isTyping={isTypingActive}
            />
          </div>

          {/* Footer */}
          <p className="relative z-10" style={{ fontSize: 12, color: 'rgba(247,252,255,0.5)', margin: 0 }}>
            © 2026 Lumislide
          </p>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-1 flex-col items-center justify-center relative overflow-hidden" style={{ background: '#f8f9fc' }}>
          {/* subtle bg gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(900px 600px at 60% 20%, rgba(79,70,229,0.05) 0%, transparent 70%)' }} />

          {/* Mobile logo (shown only on small screens) */}
          <div className="lg:hidden flex items-center gap-2 mb-8 relative z-10">
            <button type="button" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
              <img src={logoSvg} alt="Lumislide" style={{ width: 28, height: 28 }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1f2433', letterSpacing: '-0.02em' }}>Lumislide</span>
            </button>
          </div>

          {/* Form card */}
          <div
            className="relative z-10 w-full mx-auto"
            style={{
              maxWidth: 400,
              padding: '40px 36px',
              background: 'white',
              borderRadius: 20,
              border: '1px solid #e7e9f1',
              boxShadow: '0 8px 40px rgba(79,70,229,0.08)',
            }}
          >
            <div className="mb-7">
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1f2433', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
                {pageLabel}
              </h1>
              <p style={{ fontSize: 13, color: '#7d8497', margin: 0 }}>
                {isLoginMode ? '欢迎回来，请输入你的账号信息' : isResetMode ? '输入邮箱接收验证码，重置密码' : '创建账号，开始使用 Lumislide'}
              </p>
            </div>

            <fieldset disabled={modalStatus !== 'closed'} className="flex flex-col gap-6 w-full" style={{ border: 'none', padding: 0, margin: 0 }}>
                <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col gap-4">
                    <div className="w-full" style={{ display: 'none' }}>
                      <p className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl md:text-6xl">{pageEntryTitle}</p>
                    </div>
                </motion.div>
                
                <form onSubmit={handleFinalSubmit} className="w-full space-y-6">
                     <AnimatePresence>
                        {(authStep !== 'confirmPassword' || showTwoFieldLogin) && <motion.div key="email-password-fields" exit={{ opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full space-y-6">
                            <BlurFade delay={showTwoFieldLogin ? 0.18 : (authStep === 'email' ? 0.25 * 5 : 0)} inView={true} className="w-full">
                                <div className="relative w-full">
                                    <div className="flex w-full items-center gap-2">
                                      {onBack ? (
                                        <GlassButton
                                          type="button"
                                          size="icon"
                                          className="shrink-0"
                                          onClick={onBack}
                                          aria-label="Go back"
                                        >
                                          <ArrowLeft className="h-4 w-4" />
                                        </GlassButton>
                                      ) : null}
                                      <div className="glass-input-wrap w-full"><div className="glass-input">
                                        <span className="glass-input-text-area"></span>
                                        <div className={cn( "relative z-10 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out", email.length > 20 && authStep === 'email' ? "w-0 px-0" : "w-10 pl-2" )}><Mail className="h-5 w-5 text-foreground/80 flex-shrink-0" /></div>
                                        <input type="email" placeholder={emailPlaceholder} value={email} onChange={(e) => { const next = e.target.value; setEmail(next); onEmailChange?.(next); setIsTypingActive(true); setTimeout(() => setIsTypingActive(false), 1200); }} onKeyDown={handleKeyDown} className={cn("relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300", isEmailValid && authStep === 'email' && !showTwoFieldLogin ? "pr-2" : "pr-0")} />
                                        <div className={cn( "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out", isEmailValid && authStep === 'email' && !showTwoFieldLogin ? "w-10 pr-1" : "w-0" )}><GlassButton type="button" onClick={handleProgressStep} size="icon" aria-label="Continue with email" contentClassName="text-foreground/80 hover:text-foreground"><ArrowRight className="w-5 h-5" /></GlassButton></div>
                                      </div></div>
                                    </div>
                                </div>
                                {authStep === 'email' && isLoginMode && !showTwoFieldLogin ? (
                                  <div className="mt-4 flex justify-center">
                                    <GlassButton
                                      type="button"
                                      contentClassName="flex items-center justify-center gap-2"
                                      size="sm"
                                      onClick={onSwitchAuthMode}
                                    >
                                      <span className="font-semibold text-foreground">注册</span>
                                    </GlassButton>
                                  </div>
                                ) : null}
                            </BlurFade>
                            <AnimatePresence>
                                {(authStep === "password" || showTwoFieldLogin) && <BlurFade key="password-field" delay={showTwoFieldLogin ? 0.18 : 0} className="w-full">
                                    <div className="relative w-full">
                                        <div className={cn("w-full", isCodeInputStep && !showTwoFieldLogin ? "flex items-center gap-2" : "")}>
                                          <div className={cn(isCodeInputStep && !showTwoFieldLogin ? "min-w-0 flex-1" : "")}>
                                            <div className="glass-input-wrap w-full"><div className="glass-input">
                                                <span className="glass-input-text-area"></span>
                                                <div className={cn("relative z-10 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out", password.length > 20 ? "w-0 px-0" : "w-10 pl-2")}>
                                                {isCodeFieldStep ? (
                                                      <Hash className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                                                    ) : isPasswordValid ? (
                                                      <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)} className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                                    ) : (
                                                      <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <input ref={passwordInputRef} type={isCodeFieldStep ? "text" : (showPassword ? "text" : "password")} placeholder={isCodeFieldStep ? "验证码" : passwordPlaceholder} value={password} onChange={(e) => { const raw = e.target.value; const next = isCodeFieldStep ? raw.replace(/\D/g, '').slice(0, 6) : raw; setPassword(next); onPasswordChange?.(next); if (isCodeFieldStep) onCodeChange?.(next); setIsTypingActive(true); setTimeout(() => setIsTypingActive(false), 1200); }} onKeyDown={handleKeyDown} inputMode={isCodeFieldStep ? "numeric" : undefined} maxLength={isCodeFieldStep ? 6 : undefined} className={cn("relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300", isPasswordValid && !isInlineCredentialStep ? "pr-2" : "pr-0")} />
                                                <div className={cn( "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out", isPasswordValid && !isInlineCredentialStep ? "w-10 pr-1" : "w-0" )}><GlassButton type="button" onClick={handleProgressStep} size="icon" aria-label={isLoginMode ? "Sign in" : "Submit password"} contentClassName="text-foreground/80 hover:text-foreground"><ArrowRight className="w-5 h-5" /></GlassButton></div>
                                            </div></div>
                                          </div>
                                          {isCodeFieldStep && !showTwoFieldLogin ? (
                                            <GlassButton
                                              type="button"
                                              size="sm"
                                              onClick={onForgotClick || handleGoBack}
                                              disabled={secondaryActionDisabled}
                                              className={cn("shrink-0", secondaryActionDisabled && "pointer-events-none opacity-60")}
                                              contentClassName="flex items-center justify-center"
                                            >
                                              <span className="font-semibold whitespace-nowrap">{secondaryButtonText}</span>
                                            </GlassButton>
                                          ) : null}
                                        </div>
                                    </div>
                                    {isInlineCredentialStep ? (
                                      <div className="mt-4 space-y-4">
                                        <div className="glass-input-wrap w-full"><div className="glass-input">
                                          <span className="glass-input-text-area"></span>
                                          <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
                                            {isInlinePasswordValid ? <button type="button" aria-label="Toggle password visibility" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button> : <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />}
                                          </div>
                                          <input type={showConfirmPassword ? "text" : "password"} placeholder={isResetMode ? "新密码" : "设置密码"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={handleKeyDown} className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none" />
                                        </div></div>
                                        <div className="glass-input-wrap w-full"><div className="glass-input">
                                          <span className="glass-input-text-area"></span>
                                          <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
                                            {isInlineConfirmPasswordValid ? <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowInlineConfirmPassword(!showInlineConfirmPassword)} className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full">{showInlineConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button> : <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />}
                                          </div>
                                          <input type={showInlineConfirmPassword ? "text" : "password"} placeholder={isResetMode ? "确认新密码" : "确认密码"} value={inlineConfirmPassword} onChange={(e) => setInlineConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCodeAndPasswordBundle(); } }} className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none" />
                                          <div className={cn("relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out", isCodeValueValid && isInlinePasswordValid && isInlineConfirmPasswordValid ? "w-10 pr-1" : "w-0")}>
                                            <GlassButton type="button" onClick={submitCodeAndPasswordBundle} size="icon" aria-label="Finish sign-up" contentClassName="text-foreground/80 hover:text-foreground">
                                              <ArrowRight className="w-5 h-5" />
                                            </GlassButton>
                                          </div>
                                        </div></div>
                                      </div>
                                    ) : null}
                                    {showTwoFieldLogin ? (
                                      <>
                                        <label className="auth-switch-row mt-3">
                                          <input
                                            type="checkbox"
                                            className="custom-checkbox"
                                            checked={rememberPassword}
                                            onChange={(event) => onRememberPasswordChange?.(event.target.checked)}
                                          />
                                          记住密码
                                        </label>
                                      <div className="mt-5 flex items-center justify-between gap-4">
                                        <GlassButton
                                          type="button"
                                          size="sm"
                                          onClick={onSwitchAuthMode}
                                          contentClassName="flex items-center justify-center"
                                        >
                                          <span className="font-semibold">注册账号</span>
                                        </GlassButton>
                                        <GlassButton
                                          type="button"
                                          size="sm"
                                          onClick={onForgotClick || handleGoBack}
                                          contentClassName="flex items-center justify-center"
                                        >
                                          <span className="font-semibold">忘记密码</span>
                                        </GlassButton>
                                      </div>
                                      </>
                                    ) : !isCodeFieldStep ? (
                                      <div className="mt-5 flex justify-start">
                                        <GlassButton
                                          type="button"
                                          size="sm"
                                          onClick={onForgotClick || handleGoBack}
                                          disabled={secondaryActionDisabled}
                                          className={cn(secondaryActionDisabled && "pointer-events-none opacity-60")}
                                          contentClassName="flex items-center justify-center gap-2"
                                        >
                                          <ArrowLeft className="w-4 h-4" />
                                          <span className="font-semibold">{secondaryButtonText}</span>
                                        </GlassButton>
                                      </div>
                                    ) : null}
                                </BlurFade>}
                            </AnimatePresence>
                        </motion.div>}
                    </AnimatePresence>
                    <AnimatePresence>
                        {authStep === 'confirmPassword' && <BlurFade key="confirm-password-field" className="w-full">
                            <div className="relative w-full">
                                <div className="glass-input-wrap w-full"><div className="glass-input">
                                    <span className="glass-input-text-area"></span>
                                    <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
                                        {isConfirmPasswordValid ? <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button> : <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />}
                                    </div>
                                    <input ref={confirmPasswordInputRef} type={showConfirmPassword ? "text" : "password"} placeholder={confirmPlaceholder} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none" />
                                    <div className={cn( "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out", isConfirmPasswordValid ? "w-10 pr-1" : "w-0" )}><GlassButton type="submit" size="icon" aria-label="Finish sign-up" contentClassName="text-foreground/80 hover:text-foreground"><ArrowRight className="w-5 h-5" /></GlassButton></div>
                                </div></div>
                            </div>
                            <div className="mt-5 flex justify-start">
                              <GlassButton
                                type="button"
                                size="sm"
                                onClick={onSwitchAuthMode || handleGoBack}
                                contentClassName="flex items-center justify-center gap-2"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="font-semibold">{isCodeMode ? '返回登录/注册' : '返回'}</span>
                              </GlassButton>
                            </div>
                        </BlurFade>}
                    </AnimatePresence>
                </form>
            </fieldset>
          </div>
        </div>
    </div>
  );
};
