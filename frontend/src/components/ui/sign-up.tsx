import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback, Children } from "react";
// Importing class-variance-authority for the built-in button component
import { cva, type VariantProps } from "class-variance-authority";
// Importing icons from lucide-react
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, X, AlertCircle, PartyPopper, Loader, Hash } from "lucide-react";
// Importing animation components from framer-motion
import { AnimatePresence, motion, useInView } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

// --- CONFETTI LOGIC ---
import type { GlobalOptions as ConfettiGlobalOptions, CreateTypes as ConfettiInstance, Options as ConfettiOptions } from "canvas-confetti"
import confetti from "canvas-confetti"
import ArcGalleryHero from './arc-gallery-hero'
import type { StyleTemplate } from '@/types/app'
import { apiGet, withApiBase } from '@/lib/http'

type Api = { fire: (options?: ConfettiOptions) => void }
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
  
  return (
    <div className="bg-background min-h-screen w-screen flex flex-col">
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

        <div className={cn("flex w-full flex-1 h-full items-center justify-center bg-card", "relative overflow-hidden")}>
            <div className="absolute inset-0 z-0"><GradientBackground /></div>
            {galleryImages.length > 0 ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[9] flex items-start justify-center px-4 opacity-100 auth-arc-gallery-wrap"
                style={{ height: '50vh' }}
              >
                <ArcGalleryHero
                  images={galleryImages}
                  className="auth-arc-gallery"
                  motionMode="orbit"
                  orbitDurationSec={68}
                  radiusLg={560}
                  radiusMd={430}
                  radiusSm={320}
                  cardSizeLg={126}
                  cardSizeMd={100}
                  cardSizeSm={78}
                />
              </div>
            ) : null}
            <fieldset disabled={modalStatus !== 'closed'} className="relative z-10 flex flex-col items-center gap-8 w-[300px] mx-auto p-4 auth-form-center-shell min-h-[560px]">
                <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col items-center gap-4">
                    <div className="w-full text-center">
                      <p className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl md:text-6xl">{pageEntryTitle}</p>
                    </div>
                </motion.div>
                
                <form onSubmit={handleFinalSubmit} className="w-[300px] space-y-6">
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
                                        <input type="email" placeholder={emailPlaceholder} value={email} onChange={(e) => { const next = e.target.value; setEmail(next); onEmailChange?.(next); }} onKeyDown={handleKeyDown} className={cn("relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300", isEmailValid && authStep === 'email' && !showTwoFieldLogin ? "pr-2" : "pr-0")} />
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
                                                <input ref={passwordInputRef} type={isCodeFieldStep ? "text" : (showPassword ? "text" : "password")} placeholder={isCodeFieldStep ? "验证码" : passwordPlaceholder} value={password} onChange={(e) => { const raw = e.target.value; const next = isCodeFieldStep ? raw.replace(/\D/g, '').slice(0, 6) : raw; setPassword(next); onPasswordChange?.(next); if (isCodeFieldStep) onCodeChange?.(next); }} onKeyDown={handleKeyDown} inputMode={isCodeFieldStep ? "numeric" : undefined} maxLength={isCodeFieldStep ? 6 : undefined} className={cn("relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300", isPasswordValid && !isInlineCredentialStep ? "pr-2" : "pr-0")} />
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
                                <div className="glass-input-wrap w-[300px]"><div className="glass-input">
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
  );
};
