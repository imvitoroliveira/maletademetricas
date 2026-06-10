GRANT INSERT, UPDATE, DELETE ON public.profile_ad_accounts TO authenticated;
GRANT ALL ON public.profile_ad_accounts TO service_role;

CREATE POLICY "Users can insert profile ad accounts" ON public.profile_ad_accounts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their profile ad accounts" ON public.profile_ad_accounts
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete profile ad accounts" ON public.profile_ad_accounts
    FOR DELETE USING (auth.role() = 'authenticated');

-- Ensure campaigns table also has proper grants and policies for management
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

CREATE POLICY "Users can insert campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update campaigns" ON public.campaigns
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete campaigns" ON public.campaigns
    FOR DELETE USING (auth.role() = 'authenticated');
