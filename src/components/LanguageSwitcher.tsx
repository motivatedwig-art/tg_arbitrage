import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown } from 'lucide-react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const LanguageSwitcherContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const LanguageButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const LanguageDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: rgba(28, 28, 30, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 1000;
  min-width: 120px;
`;

const LanguageOption = styled(motion.button)<{ isActive: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: ${props => props.isActive ? 'rgba(255, 214, 10, 0.1)' : 'transparent'};
  border: none;
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: ${props => props.isActive ? '600' : '400'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:first-child {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
  
  &:last-child {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }
`;

const LanguageFlag = styled.span`
  font-size: 16px;
`;

const LanguageName = styled.span`
  flex: 1;
  text-align: left;
`;

const ChevronIcon = styled(motion.div)<{ isOpen: boolean }>`
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

interface LanguageSwitcherProps {
  className?: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const newLanguage = languages.find(lang => lang.code === lng) || languages[0];
      setCurrentLanguage(newLanguage);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      localStorage.setItem('language', languageCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <LanguageSwitcherContainer className={className}>
      <LanguageButton
        onClick={toggleDropdown}
        whileTap={{ scale: 0.95 }}
      >
        <Globe size={16} />
        <span>{currentLanguage.code.toUpperCase()}</span>
        <ChevronIcon isOpen={isOpen}>
          <ChevronDown size={14} />
        </ChevronIcon>
      </LanguageButton>

      <AnimatePresence>
        {isOpen && (
          <LanguageDropdown
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {languages.map((language, index) => (
              <LanguageOption
                key={language.code}
                isActive={language.code === currentLanguage.code}
                onClick={() => handleLanguageSelect(language.code)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <LanguageFlag>{language.flag}</LanguageFlag>
                <LanguageName>{language.name}</LanguageName>
              </LanguageOption>
            ))}
          </LanguageDropdown>
        )}
      </AnimatePresence>
    </LanguageSwitcherContainer>
  );
};

export default LanguageSwitcher;
