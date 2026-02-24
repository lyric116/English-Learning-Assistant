import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Card className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 text-primary-600 mb-4">
          <Compass className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">404</p>
        <h1 className="text-2xl font-bold mb-2">页面不存在</h1>
        <p className="text-muted-foreground mb-6">你访问的地址无效或已被移动。</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </Card>
    </div>
  );
}
