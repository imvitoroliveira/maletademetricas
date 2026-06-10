GRANT INSERT, UPDATE, DELETE ON public.ad_accounts TO authenticated;
GRANT ALL ON public.ad_accounts TO service_role;

CREATE POLICY "Users can insert ad accounts" ON public.ad_accounts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their ad accounts" ON public.ad_accounts
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete ad accounts" ON public.ad_accounts
    FOR DELETE USING (auth.role() = 'authenticated');