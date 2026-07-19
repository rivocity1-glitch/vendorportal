import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Joyride as ReactJoyride, ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { supabase } from '../../../lib/supabase';
import { onboardingSteps } from './TourSteps';
import { TourTooltip } from './TourTooltip';

interface TourContextType {
  startTour: () => void;
  stopTour: () => void;
  restartTour: () => void;
  isTourActive: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used inside a TourProvider element container.');
  }
  return context;
};

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [run, setRun] = useState<boolean>(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Map onboarding configuration data schema directly to React Joyride formatting structure
  const joyrideSteps: Step[] = useMemo(() => {
    return onboardingSteps.map(step => ({
      target: step.target,
      title: step.title,
      content: step.description,
      placement: step.placement,
      disableBeacon: true,
      disableOverlayClose: true,
      hideBackButton: false,
    }));
  }, []);

  useEffect(() => {
    async function checkTourStatus() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data: vendor, error } = await supabase
          .from('vendors')
          .select('id, tour_completed')
          .eq('auth_user_id', authData.user.id)
          .maybeSingle();

        if (error || !vendor) return;

        setVendorId(vendor.id);
        
        // Auto-initialize if tour flag registers false
        if (!vendor.tour_completed) {
          setStepIndex(0);
          setRun(true);
        }
      } catch (err) {
        console.error('Error fetching vendor onboarding tour status:', err);
      }
    }
    checkTourStatus();
  }, []);

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const stopTour = () => {
    setRun(false);
  };

  const restartTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const handleUpdateTourCompleted = async () => {
    if (!vendorId) return;
    try {
      await supabase
        .from('vendors')
        .update({ tour_completed: true })
        .eq('id', vendorId);
    } catch (err) {
      console.error('Failed to commit tour completion state parameter change:', err);
    }
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Gracefully advance safely past elements not rendered or current viewports
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    } else if (type === EVENTS.TOUR_STATUS || status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
        setRun(false);
        handleUpdateTourCompleted();
      }
    }
  };

  return (
    <TourContext.Provider value={{ startTour, stopTour, restartTour, isTourActive: run }}>
      {children}
      <ReactJoyride
        run={run}
        stepIndex={stepIndex}
        steps={joyrideSteps}
        {...({ callback: handleJoyrideCallback } as any)}
        continuous={true}
        showProgress={false}
        showSkipButton={true}
        disableOverlayClose={true}
        disableCloseOnEsc={true}
        disableScrollParentMousedown={true}
        scrollOffset={120}
        // styles typing in react-joyride can be strict; cast to any to avoid incorrect
        // type errors for valid style keys like spotlight.borderRadius
        styles={({
          options: {
            arrowColor: 'transparent',
            overlayColor: 'rgba(2, 6, 23, 0.75)',
            zIndex: 10000,
          },
          spotlight: {
            borderRadius: 16,
          },
        } as unknown) as any}
        tooltipComponent={TourTooltip}
      />
    </TourContext.Provider>
  );
};