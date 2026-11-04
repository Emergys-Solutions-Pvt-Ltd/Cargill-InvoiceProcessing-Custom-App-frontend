import React, { useContext } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Mail, Plug } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import EmailConnectionTab from './EmailConnectionTab';
import EmailRegistrationTab from './EmailRegistrationTab';

/** Settings > Email Configuration: one Graph connection · many registered mailboxes. Each tab loads and saves its own data. */
const TABS = [
  { id: 'connection', icon: Plug, label: 'emailTabConnection', fallback: 'Connection' },
  { id: 'registration', icon: Mail, label: 'emailTabRegistration', fallback: 'Email Registration' },
];

const EmailConfigurationForm = () => {
  const { t } = useContext(LanguageContext);
  const { tab: tabParam } = useParams();
  const tab = TABS.find((x) => x.id === tabParam)?.id ?? 'connection';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('emailConfigurationMenu', 'Email Configuration')}</h1>
        <p className="page-subtitle">
          {t('emailConfigurationSubtitle', 'Microsoft Graph connection and the mailboxes read for invoice processing.')}
        </p>
      </div>

      <div className="tab-bar email-tab-bar">
        {TABS.map((x) => {
          const Icon = x.icon;
          return (
            <NavLink key={x.id} to={`/settings/email-configuration/${x.id}`} replace
              className={() => `tab-link ${tab === x.id ? 'active' : ''}`}>
              <Icon size={15} /> {t(x.label, x.fallback)}
            </NavLink>
          );
        })}
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        {tab === 'connection' && <EmailConnectionTab />}
        {tab === 'registration' && <EmailRegistrationTab />}
      </div>
    </div>
  );
};

export default EmailConfigurationForm;
