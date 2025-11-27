/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/components/ui/LoadingSpinner.tsx
 * PURPOSE: Reusable loading spinner and button loading components
 * EXPORTS: LoadingSpinner, ButtonLoading
 * 
 * COMPONENTS:
 * - LoadingSpinner: Animated spinner with sm/md/lg sizes
 * - ButtonLoading: Button wrapper that shows spinner during loading state
 * 
 * STYLING: Tailwind CSS (animate-spin, border-blue-600)
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`}></div>
  )
}

interface ButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

export function ButtonLoading({
  isLoading,
  children,
  className = '',
  disabled = false,
  type = 'button',
  onClick
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`relative ${className} ${isLoading ? 'cursor-not-allowed' : ''}`}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </span>
      )}
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
    </button>
  )
}
