'use client';

import { Clock, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LiveMeeting() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-lg border-2 border-primary/20 shadow-lg">
        <CardContent className="p-10 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Live Meeting
          </h1>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              Real-time collaboration
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              Coming Soon
            </Badge>
          </div>

          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            We're building an immersive live meeting experience with agenda tracking, 
            real-time notes, voting, action items, and AI assistance.
            <br /><br />
            <strong>Stay tuned — launching soon!</strong>
          </p>

          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Feature in development • Expected Q2 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}