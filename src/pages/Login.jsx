import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { authService } from '../services/auth.service';
import { storageService } from '../services/storage.service';
import { msalConfigured, startMicrosoftSignIn } from '../services/msal.service';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ShieldCheck, CreditCard, FileText, Lock, Layers, LayoutGrid, Clock } from 'lucide-react';
import cargillLogo from '../assets/cargill_logo.svg';

const DEMO_USERS = [
  {
    id: 'admin',
    label: 'Admin User',
    email: 'admin@cargill.com',
    password: 'password',
    role: 'Admin',
    access: 'Full Admin (3 Apps + UAM)',
    icon: ShieldCheck,
    badgeClass: 'badge-success'
  },
  {
    id: 'GP-sjo',
    label: 'Multi-App User (GP + SJO)',
    email: 'GP.sjo.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '2 Apps Visible (GP & SJO)',
    icon: Layers,
    badgeClass: 'badge-info'
  },
  {
    id: 'sjo-rospbu',
    label: 'Multi-App User (SJO + ROSPBU)',
    email: 'sjo.rospbu.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '2 Apps Visible (SJO & ROSPBU)',
    icon: Layers,
    badgeClass: 'badge-info'
  },
  {
    id: 'multi-all',
    label: 'Multi-App User (All 3 Apps)',
    email: 'user@cargill.com',
    password: 'password',
    role: 'User',
    access: '3 Apps Visible (GP, SJO, ROSPBU)',
    icon: LayoutGrid,
    badgeClass: 'badge-info'
  },
  {
    id: 'GP',
    label: 'Single-App User (GP Only)',
    email: 'GP.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '1 App Visible (GP Only)',
    icon: CreditCard,
    badgeClass: 'badge-warning'
  },
  {
    id: 'sjo',
    label: 'Single-App User (SJO Only)',
    email: 'sjo.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '1 App Visible (SJO Only)',
    icon: FileText,
    badgeClass: 'badge-warning'
  }
];

const Login = () => {
  const [username, setUsername] = useState('admin@cargill.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  // Until /auth/options answers: Microsoft button when the build has MSAL settings, password form always
  const [options, setOptions] = useState({ ssoEnabled: msalConfigured, passwordLoginEnabled: true });
  const { user, login, getDefaultRoute, ssoError, clearSsoError } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const showMicrosoft = msalConfigured && options.ssoEnabled;
  const showPassword = options.passwordLoginEnabled;

  useEffect(() => {
    let active = true;
    authService.getOptions()
      .then((data) => { if (active) setOptions(data); })
      .catch(() => {});
    const reason = storageService.get('logoutReason');
    storageService.remove('logoutReason');
    if (reason === 'idle') setNotice(t('sessionIdleLoggedOut', 'You were signed out after a period of inactivity. Please sign in again.'));
    if (reason === 'expired') setNotice(t('sessionExpired', 'Your session has ended. Please sign in again.'));
    return () => { active = false; };
  }, [t]);

  // Signed in (e.g. back from the Microsoft sign-in page): go to the user's start page
  useEffect(() => {
    if (user) navigate(getDefaultRoute(user), { replace: true });
  }, [user, navigate, getDefaultRoute]);

  const handleMicrosoftLogin = async () => {
    setError('');
    setNotice('');
    clearSsoError();
    setIsRedirecting(true);
    try {
      await startMicrosoftSignIn();
    } catch (err) {
      setIsRedirecting(false);
      setError(err?.message || t('microsoftSignInFailed', 'Microsoft sign-in failed'));
    }
  };

  const handleLogin = async (e, customUser, customPass) => {
    if (e) e.preventDefault();
    setError('');
    setNotice('');
    clearSsoError();
    setIsLoading(true);

    const userToLogin = customUser || username;
    const passToLogin = customPass || password;

    try {
      const loggedInUser = await login(userToLogin, passToLogin, false);
      const targetRoute = getDefaultRoute(loggedInUser);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (demo) => {
    setUsername(demo.email);
    setPassword(demo.password);
    handleLogin(null, demo.email, demo.password);
  };

  return (
    <main className="flex min-h-screen gap-6 bg-(--bg-color) p-4 md:p-5">
      {/* Brand panel (hidden on small screens) */}
      <section
        aria-hidden="true"
        className="login-hero hidden flex-col justify-end rounded-2xl px-14 pb-16 text-white md:flex md:w-[58%]"
      >
        <h2 className="mb-5 text-[3.6rem] font-semibold leading-[1.12] tracking-[-0.01em] text-white">
          {t('loginHeroTitleLine1', 'Enterprise')}
          <br />
          {t('loginHeroTitleLine2', 'Service Portal')}
        </h2>
        <p className="max-w-[640px] text-[1.05rem] leading-[1.45] text-[rgba(255,255,255,0.85)]">
          {t(
            'loginHeroSubtitle',
            'Access and track service requests, incidents, tasks, and knowledge resources from a single centralized workspace designed to simplify enterprise support.',
          )}
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[500px]">
          <img src={cargillLogo} alt="Cargill" className="mb-20 h-14" />

          <Typography component="h1" className="mb-7 text-[1.9rem] font-semibold text-(--text-primary)">
            {t('appName', 'LATAM Invoice Workflow')}
          </Typography>

          {(error || ssoError) && (
            <Alert severity="error" icon={<Lock size={16} />} className="mb-6">
              {error || ssoError}
            </Alert>
          )}

          {notice && !error && !ssoError && (
            <Alert severity="success" icon={<Clock size={16} />} className="mb-6" role="status">
              {notice}
            </Alert>
          )}

          {showMicrosoft && (
            <>
              <Typography className="mb-12 text-[1.1rem] leading-[1.65] text-(--text-secondary)">
                {t(
                  'loginSsoHint',
                  "This portal doesn't require username and password and uses Active Directory ID for Authentication. Kindly press the below button using your work system.",
                )}
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                disableElevation
                onClick={handleMicrosoftLogin}
                disabled={isRedirecting || isLoading}
                className="h-[46px] rounded-sm text-base font-medium normal-case"
              >
                {isRedirecting ? t('redirectingToMicrosoft', 'Redirecting to Microsoft…') : t('login', 'Login')}
              </Button>
            </>
          )}

          {showPassword && (
            <div className={showMicrosoft ? 'mt-8' : ''}>
              {showMicrosoft && (
                <Divider className="mb-5 text-[0.8rem] text-(--text-secondary)">
                  {t('orSignInManually', 'or sign in manually')}
                </Divider>
              )}

              <form onSubmit={(e) => handleLogin(e)} className="flex flex-col gap-4">
                <TextField
                  label={t('emailUsername')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <TextField
                  type="password"
                  label={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Button
                  type="submit"
                  variant={showMicrosoft ? 'outlined' : 'contained'}
                  size="large"
                  fullWidth
                  disableElevation
                  disabled={isLoading}
                  className="mt-2 h-[46px] rounded-sm text-base font-medium normal-case"
                >
                  {isLoading ? t('signingIn') : showMicrosoft ? t('signIn') : t('login', 'Login')}
                </Button>
              </form>

              {/* Demo quick login (password sign-in only; hide with AUTH_PASSWORD_LOGIN_ENABLED=false) */}
              <div className="mt-6">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowDemo((v) => !v)}
                  aria-expanded={showDemo}
                  className="normal-case"
                >
                  {showDemo ? t('hideDemoAccounts', 'Hide demo accounts') : t('showDemoAccounts', 'Use a demo account')}
                </Button>
                {showDemo && (
                  <div className="mt-2 flex flex-col gap-2">
                    {DEMO_USERS.map((demo) => {
                      const Icon = demo.icon;
                      const isSelected = username === demo.email;
                      return (
                        <ButtonBase
                          key={demo.id}
                          onClick={() => handleSelectDemo(demo)}
                          disabled={isLoading}
                          className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-[0.9rem] py-[0.65rem] text-left transition-all duration-200 ${
                            isSelected
                              ? 'border-[1.5px] border-solid border-(--primary-color) bg-[rgba(var(--primary-rgb),0.1)]'
                              : 'border border-solid border-(--border-color) bg-[rgba(255,255,255,0.02)]'
                          }`}
                        >
                          <span className="flex items-center gap-[0.65rem]">
                            <span className="flex text-(--primary-color)">
                              <Icon size={18} />
                            </span>
                            <span>
                              <span className="block text-[0.85rem] font-semibold text-(--text-primary)">{demo.label}</span>
                              <span className="block text-xs text-(--text-secondary)">{demo.email}</span>
                            </span>
                          </span>
                          <span className={`badge ${demo.badgeClass} px-2 py-[2px] text-[0.7rem]`}>{demo.access}</span>
                        </ButtonBase>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;
