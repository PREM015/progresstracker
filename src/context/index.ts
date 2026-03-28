// src/context/index.ts
// Barrel export for all context providers and hooks

export {
  FeatureFlagProvider,
  useFeatureFlags,
  useFeatureFlag,
} from './FeatureFlagContext';

export {
  ModalProvider,
  useModal,
  useManagedModal,
  type ModalConfig,
  type ModalSize,
} from './ModalContext';

export {
  SidebarProvider,
  useSidebar,
} from './SidebarContext';

export {
  SearchProvider,
  useSearch,
  type SearchCategory,
  type SearchResult,
} from './SearchContext';

export {
  OnboardingProvider,
  useOnboarding,
  type OnboardingStep,
  type OnboardingState,
} from './OnboardingContext';
