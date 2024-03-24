import { useEffect, useState } from 'react';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppError } from '@documenso/lib/errors/app-error';
import { DocumentAuth, type TRecipientActionAuth } from '@documenso/lib/types/document-auth';
import { RecipientRole } from '@documenso/prisma/client';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { DialogFooter } from '@documenso/ui/primitives/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';

import { useRequiredDocumentAuthContext } from './document-auth-provider';

export type DocumentActionAuth2FAProps = {
  actionTarget?: 'FIELD' | 'DOCUMENT';
  actionVerb?: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onReauthFormSubmit: (values?: TRecipientActionAuth) => Promise<void> | void;
};

const Z2FAAuthFormSchema = z.object({
  token: z
    .string()
    .min(4, { message: 'Token must at least 4 characters long' })
    .max(10, { message: 'Token must be at most 10 characters long' }),
});

type T2FAAuthFormSchema = z.infer<typeof Z2FAAuthFormSchema>;

export const DocumentActionAuth2FA = ({
  actionTarget = 'FIELD',
  actionVerb = 'sign',
  onReauthFormSubmit,
  open,
  onOpenChange,
}: DocumentActionAuth2FAProps) => {
  const { recipient, user, isCurrentlyAuthenticating, setIsCurrentlyAuthenticating } =
    useRequiredDocumentAuthContext();

  const form = useForm<T2FAAuthFormSchema>({
    resolver: zodResolver(Z2FAAuthFormSchema),
    defaultValues: {
      token: '',
    },
  });

  const [formErrorCode, setFormErrorCode] = useState<string | null>(null);

  const onFormSubmit = async ({ token }: T2FAAuthFormSchema) => {
    try {
      setIsCurrentlyAuthenticating(true);

      await onReauthFormSubmit({
        type: DocumentAuth['2FA'],
        token,
      });

      setIsCurrentlyAuthenticating(false);

      onOpenChange(false);
    } catch (err) {
      setIsCurrentlyAuthenticating(false);

      const error = AppError.parseError(err);
      setFormErrorCode(error.code);

      // Todo: Alert.
    }
  };

  useEffect(() => {
    form.reset({
      token: '',
    });

    setFormErrorCode(null);
  }, [open, form]);

  if (!user?.twoFactorEnabled) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          <AlertDescription>
            {recipient.role === RecipientRole.VIEWER && actionTarget === 'DOCUMENT'
              ? 'You need to setup 2FA to mark this document as viewed.'
              : `You need to setup 2FA to ${actionVerb.toLowerCase()} this ${actionTarget.toLowerCase()}.`}
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button type="button" asChild>
            <Link href="/settings/security">Setup 2FA</Link>
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <fieldset disabled={isCurrentlyAuthenticating}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>2FA token</FormLabel>

                  <FormControl>
                    <Input {...field} placeholder="Token" />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {formErrorCode && (
              <Alert variant="destructive">
                <AlertTitle>Unauthorized</AlertTitle>
                <AlertDescription>
                  We were unable to verify your details. Please try again or contact support
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button type="submit" loading={isCurrentlyAuthenticating}>
                Sign
              </Button>
            </DialogFooter>
          </div>
        </fieldset>
      </form>
    </Form>
  );
};