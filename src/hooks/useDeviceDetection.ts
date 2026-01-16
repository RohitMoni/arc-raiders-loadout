import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-tablet'

export const deviceDetection = {
  // Primary input detection
  isTouchPrimary: () => window.matchMedia('(hover: none) and (pointer: coarse)').matches,
  isMousePrimary: () => window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  isHybridDevice: () => window.matchMedia('(hover: hover) and (pointer: coarse)').matches,
  
  // Touch capability detection
  hasTouchSupport: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  
  // Screen characteristics
  isLargeScreen: () => window.innerWidth >= 1024,
  isPortrait: () => window.matchMedia('(orientation: portrait)').matches,
  
  // Apple device detection (for iPad Pro edge cases)
  isAppleDevice: () => /iPad|iPhone|iPod|Mac/.test(navigator.userAgent),
  
  // iPad Pro specific detection
  isLargeiPad: () => {
    const ua = navigator.userAgent;
    const isIPad = /iPad/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const hasLargeScreen = window.innerWidth >= 1024;
    return isIPad && hasLargeScreen;
  },

  // Device type classification
  getDeviceType: (): DeviceType => {
    if (deviceDetection.isLargeiPad()) return 'large-tablet';
    if (deviceDetection.isTouchPrimary() && !deviceDetection.isLargeScreen()) return 'mobile';
    if (deviceDetection.isTouchPrimary() && deviceDetection.isLargeScreen()) return 'tablet';
    return 'desktop';
  }
}

export const useDeviceDetection = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => 
    deviceDetection.getDeviceType()
  );

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia('(hover: none) and (pointer: coarse)'),
      window.matchMedia('(hover: hover) and (pointer: fine)'),
      window.matchMedia('(orientation: portrait)'),
      window.matchMedia('(min-width: 1024px)')
    ];

    const updateDeviceType = () => {
      setDeviceType(deviceDetection.getDeviceType());
    };

    mediaQueries.forEach(mq => mq.addListener(updateDeviceType));
    
    // Also listen for resize events for edge cases
    window.addEventListener('resize', updateDeviceType);

    return () => {
      mediaQueries.forEach(mq => mq.removeListener(updateDeviceType));
      window.removeEventListener('resize', updateDeviceType);
    };
  }, []);

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isLargeTablet: deviceType === 'large-tablet',
    isDesktop: deviceType === 'desktop',
    isTouchDevice: deviceType !== 'desktop',
    ...deviceDetection
  };
};