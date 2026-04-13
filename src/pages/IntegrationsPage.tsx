import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';

const IntegrationsPage = () => {
  const { t } = useTranslation();
  const apps = [
    { name: 'Moms App', url: 'https://app.fellas.id/', icon: 'https://app.fellas.id/favicon.ico', desc: 'Comprehensive support for mothers.' },
    { name: 'Nutrition Intake App', url: 'https://lapaq.app:3000', icon: 'https://lapaq.app:3000/favicon.ico', desc: 'Advanced nutrition tracking and planning.' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('integrations')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apps.map((app) => (
          <a 
            key={app.name} 
            href={app.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="card hover:border-brand-primary transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={app.icon} alt={app.name} className="w-8 h-8" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + app.name)} />
              </div>
              <ExternalLink size={20} className="text-slate-300 group-hover:text-brand-primary transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{app.name}</h3>
            <p className="text-slate-500 text-sm">{app.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default IntegrationsPage;
