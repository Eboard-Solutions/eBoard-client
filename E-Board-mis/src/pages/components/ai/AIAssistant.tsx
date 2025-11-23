import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AIAssistantProps {
  context: 'meeting' | 'document' | 'task' | 'general';
  inputText?: string;
  onSummaryGenerated?: (summary: string) => void;
}

export function AIAssistant({ context, inputText = '', onSummaryGenerated }: AIAssistantProps) {
  const [input, setInput] = useState(inputText);
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generateSummary = async () => {
    if (!input.trim()) {
      toast.error('Please provide some content to summarize');
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate contextual summary based on type
    let generatedSummary = '';
    
    switch (context) {
      case 'meeting':
        generatedSummary = `**Meeting Summary**

**Key Discussion Points:**
- Strategic planning initiatives for Q1 were reviewed and approved
- Budget allocation across departments was finalized with majority agreement
- New partnership opportunities were discussed and evaluated

**Decisions Made:**
- Approved $500K budget for operations expansion
- Scheduled follow-up meeting for partnership review
- Assigned task force for strategy implementation

**Action Items:**
- Sarah Johnson to prepare detailed financial report by March 15
- Michael Chen to coordinate with partnership team
- Board to review implementation timeline next week

**Next Steps:**
The board will reconvene in two weeks to assess progress on approved initiatives and review partnership proposals.`;
        break;

      case 'document':
        generatedSummary = `**Document Analysis**

**Main Topics:**
This document covers strategic planning, financial allocations, and operational guidelines for the upcoming fiscal year.

**Key Points:**
- Outlines budget distribution across all departments
- Defines success metrics and KPIs for tracking progress
- Establishes governance framework for decision-making

**Recommendations:**
- Review quarterly to ensure alignment with objectives
- Update stakeholders on progress monthly
- Adjust allocations based on performance metrics

**Conclusion:**
The document provides a comprehensive roadmap for achieving organizational goals while maintaining fiscal responsibility.`;
        break;

      case 'task':
        generatedSummary = `**Task Breakdown & Recommendations**

**Objective:**
Complete comprehensive analysis and implementation of proposed initiatives.

**Suggested Approach:**
1. Research and gather relevant data
2. Consult with stakeholders and subject matter experts
3. Draft preliminary recommendations
4. Review with leadership team
5. Finalize and present findings

**Timeline Recommendation:**
- Research phase: 3-5 days
- Consultation: 2-3 days
- Draft creation: 2 days
- Review and finalization: 1-2 days

**Priority Level:** High - This task impacts strategic decision-making`;
        break;

      default:
        generatedSummary = `**AI Summary**

Based on the provided content, here are the key insights:

**Main Points:**
- Important decisions and discussions are captured
- Action items and responsibilities are clearly defined
- Timeline and next steps are established

**Recommendations:**
- Follow up on assigned tasks within proposed timelines
- Keep stakeholders informed of progress
- Schedule regular check-ins to ensure alignment

This summary provides a concise overview of the essential information for quick reference and action.`;
    }

    setSummary(generatedSummary);
    setIsGenerating(false);
    
    if (onSummaryGenerated) {
      onSummaryGenerated(generatedSummary);
    }

    toast.success('Summary generated successfully!');
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(summary);
    setIsCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const regenerate = () => {
    setSummary('');
    generateSummary();
  };

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI Assistant
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {context === 'meeting' && 'Meeting Notes or Transcript'}
                {context === 'document' && 'Document Content'}
                {context === 'task' && 'Task Description'}
                {context === 'general' && 'Content to Summarize'}
              </label>
              <Textarea
                placeholder={
                  context === 'meeting'
                    ? 'Paste meeting notes, transcript, or discussion points...'
                    : context === 'document'
                    ? 'Paste document content to analyze...'
                    : context === 'task'
                    ? 'Describe the task or project details...'
                    : 'Enter any content you want to summarize...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            <Button
              onClick={generateSummary}
              disabled={isGenerating || !input.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Summary
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">AI-Generated Summary</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerate}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {summary.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <h4 key={i} className="font-semibold text-foreground mt-4 mb-2 first:mt-0">
                          {line.replace(/\*\*/g, '')}
                        </h4>
                      );
                    }
                    if (line.startsWith('-')) {
                      return (
                        <li key={i} className="text-muted-foreground ml-4">
                          {line.substring(1).trim()}
                        </li>
                      );
                    }
                    if (line.match(/^\d+\./)) {
                      return (
                        <li key={i} className="text-muted-foreground ml-4 list-decimal">
                          {line.replace(/^\d+\./, '').trim()}
                        </li>
                      );
                    }
                    return line ? (
                      <p key={i} className="text-muted-foreground mb-2">
                        {line}
                      </p>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setSummary('')}
              className="w-full"
            >
              Start New Summary
            </Button>
          </>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            AI-powered summaries help you quickly understand key points, decisions, and action items.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}