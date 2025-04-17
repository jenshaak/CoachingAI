'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function N8nTestPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);

  const handleTriggerWebhook = async () => {
    if (!webhookUrl.trim()) {
      setError('Please enter a valid n8n webhook URL.');
      return;
    }

    setIsLoading(true);
    setResponseData(null);
    setError(null);

    try {
      // We'll send a simple POST request. Adjust if your n8n workflow expects GET or specific data.
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // You can add a body here if your n8n workflow expects specific input data
        // body: JSON.stringify({ message: 'Hello from test page!' }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status} ${response.statusText}`);
      }

      // Attempt to parse the response as JSON
      const data = await response.json();
      setResponseData(data);

    } catch (err) {
      console.error('Webhook error:', err);
      setError(err.message || 'An error occurred while triggering the webhook.');
      setResponseData(null); // Clear any previous data on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>n8n Webhook Test</CardTitle>
          <CardDescription>
            Enter your n8n webhook URL and click Trigger to send a request and see the response.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-n8n-instance.com/webhook/your-path"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleTriggerWebhook} disabled={isLoading || !webhookUrl.trim()}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Triggering...
              </>
            ) : (
              'Trigger Webhook'
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-4">
          {error && (
            <div className="w-full p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          {responseData && (
            <div className="w-full space-y-2">
              <h3 className="text-lg font-semibold">Response Data:</h3>
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                {JSON.stringify(responseData, null, 2)}
              </pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
