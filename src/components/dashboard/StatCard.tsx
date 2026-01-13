import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'destructive';
  className?: string;
}

const StatCard = ({ title, value, subtitle, icon, trend, variant = 'default', className }: StatCardProps) => {
  const variants = {
    default: 'bg-card',
    primary: 'gradient-primary text-primary-foreground',
    secondary: 'gradient-secondary text-secondary-foreground',
    destructive: 'bg-destructive/10 border-destructive/20',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300',
        variants[variant],
        variant === 'default' && 'border border-border',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-sm font-medium mb-1',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}>
            {title}
          </p>
          <h3 className="text-2xl lg:text-3xl font-bold">{value}</h3>
          {subtitle && (
            <p className={cn(
              'text-sm mt-1',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm',
              trend.isPositive ? 'text-success' : 'text-destructive',
              variant !== 'default' && (trend.isPositive ? 'text-success-foreground' : 'opacity-90')
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}% vs período anterior</span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          variant === 'default' ? 'bg-primary/10 text-primary' : 'bg-white/20'
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
