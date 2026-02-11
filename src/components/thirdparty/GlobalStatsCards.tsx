import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, IndianRupee, ArrowDownCircle, Wallet, Clock } from 'lucide-react';

interface GlobalStatsCardsProps {
  totalWorkAllotted: number;
  totalSanctionedAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
  totalCurrentBalance: number;
}

export function GlobalStatsCards({
  totalWorkAllotted,
  totalSanctionedAmount,
  totalPaidAmount,
  totalBalance,
  totalCurrentBalance,
}: GlobalStatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const stats = [
    {
      title: 'Total Work Allotted',
      value: totalWorkAllotted.toString(),
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Sanctioned Amount',
      value: formatCurrency(totalSanctionedAmount),
      icon: IndianRupee,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Paid Amount',
      value: formatCurrency(totalPaidAmount),
      icon: ArrowDownCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Balance',
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color: totalBalance > 0 ? 'text-orange-600' : 'text-emerald-600',
      bgColor: totalBalance > 0 ? 'bg-orange-50' : 'bg-emerald-50',
      subtitle: 'Global Liability',
    },
    {
      title: 'Total Current Balance',
      // We use Math.abs to show a clean number and handle the sign via the subtitle
      value: formatCurrency(Math.abs(totalCurrentBalance)),
      icon: Clock,
      // If balance is positive, it's Due (Red). If negative, it's Advance (Emerald).
      color: totalCurrentBalance > 0 ? 'text-red-600' : 'text-emerald-600',
      bgColor: totalCurrentBalance > 0 ? 'bg-red-50' : 'bg-emerald-50',
      subtitle: totalCurrentBalance > 0 ? 'Immediate Due' : 'Overall Advance',
      highlight: totalCurrentBalance > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`overflow-hidden transition-all ${stat.highlight ? 'ring-1 ring-red-200 shadow-sm' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${stat.color}`}>
                {/* Prefix with + or - for the Current Balance card specifically */}
                {stat.title === 'Total Current Balance' && (totalCurrentBalance > 0 ? '₹+' : '₹-')}
                {stat.title === 'Total Current Balance' 
                   ? Math.abs(totalCurrentBalance).toLocaleString('en-IN') 
                   : stat.value}
              </div>
              {stat.subtitle && (
                <p className={`text-[10px] uppercase font-bold mt-1 ${stat.color} opacity-80 tracking-wider`}>
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}