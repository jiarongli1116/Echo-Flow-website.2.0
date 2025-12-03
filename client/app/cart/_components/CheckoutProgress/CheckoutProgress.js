import React from 'react';
import { CartIcon, PaymentIcon, CheckIcon } from '@/components/icons/Icons';
import styles from './CheckoutProgress.module.css';

const CheckoutProgress = ({ currentStep = 1 }) => {
  const steps = [
    {
      id: 1,
      label: '確認購物車',
      icon: CartIcon,
    },
    {
      id: 2,
      label: '付款及運送',
      icon: PaymentIcon,
    },
    {
      id: 3,
      label: '訂單完成',
      icon: CheckIcon,
    },
  ];

  return (
    <div className={`${styles.checkoutProgress} mb-4`}>
      <div className={styles.progressContainer}>
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`${styles.progressStep} ${
                  styles[`step${step.id}`]
                } ${isActive ? styles.active : ''} ${
                  isCompleted ? styles.completed : ''
                }`}
              >
                <div className={styles.stepIcon}>
                  <IconComponent
                    width={20}
                    height={20}
                    fill={isActive || isCompleted ? '#fff' : '#6c757d'}
                  />
                </div>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`${styles.progressLine} ${
                    isCompleted ? styles[`step${step.id}Completed`] : ''
                  }`}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutProgress;
