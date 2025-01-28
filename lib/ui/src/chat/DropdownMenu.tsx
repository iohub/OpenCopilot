import React from 'react';
import styles from './DropdownMenu.module.css';
import { CategoryOption, CategoryList } from '@sourcegraph/cody-shared/src/common/component';

interface DropdownMenuProps {
  isOpen: boolean;
  categories: CategoryList[];
  onSelect: (option: CategoryOption) => void;
  onEdit?: () => void;
  icon: string;
  label: string;
  position?: 'left' | 'center';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  isOpen,
  categories,
  onSelect,
  onEdit,
  icon,
  label,
  position = 'center',
}) => {
  if (!isOpen) return null;

  const menuClassName = `${styles.menu} ${position === 'left' ? styles.menuLeft : styles.menuCenter}`;

  return (
    <div className={menuClassName}>
      {onEdit && (
        <>
          <button
            className={`${styles.option} ${styles.editOption}`}
            onClick={onEdit}
          >
            <span className={styles.optionTitle}>Edit</span>
          </button>
          <div className={styles.divider} />
        </>
      )}
      
      {categories.map((category, index) => (
        <div key={category.title} className={styles.category}>
          <div className={styles.categoryHeader}>
            {category.title}
          </div>
          {category.options.map(option => (
            <button
              key={option.model}
              className={styles.option}
              onClick={() => onSelect(option)}
            >
              <span className={styles.optionTitle}>{option.title}</span>
              {option.badge && (
                <span className={styles.badge}>{option.badge}</span>
              )}
            </button>
          ))}
          {index < categories.length - 1 && (
            <div className={styles.divider} />
          )}
        </div>
      ))}
    </div>
  );
};

interface DropdownButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  onClick,
  icon,
  label,
}) => (
  <button 
    type="button" 
    className={styles.dropdownButton}
    onClick={onClick}
  >
    <span className={`codicon codicon-${icon}`} />
    {label}
    <span className={styles.dropdownArrow}>▾</span>
  </button>
); 