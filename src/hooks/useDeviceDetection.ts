import { useState } from 'react'

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
  // Detect device type once at startup and cache it
  // This prevents Chrome DevTools inspector from switching the layout
  const [deviceType] = useState<DeviceType>(() => 
    deviceDetection.getDeviceType()
  );

  // Note: We deliberately don't listen to media query changes
  // because Chrome DevTools inspector breaks media queries when activated

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