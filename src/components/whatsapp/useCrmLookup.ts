import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";
import type { CrmDeal } from "./helpers";

export const useCrmLookup = (phone: string | undefined | null) => {
    const [deal, setDeal] = useState<CrmDeal | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const lastPhoneRef = useRef<string>("");

    const searchDeal = useCallback(async (phoneToSearch: string) => {
        if (!phoneToSearch) { setDeal(null); setSearched(false); return; }

        const digits = phoneToSearch.replace(/\D/g, "");
        if (digits.length < 8) { setDeal(null); setSearched(true); return; }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("deals")
                .select("*")
                .or(`customer_phone.ilike.%${digits.slice(-8)}%,customer_phone.ilike.%${digits}%`)
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) {
                logger.error("[CRM lookup]", error);
                setDeal(null);
            } else {
                setDeal(data && data.length > 0 ? data[0] as CrmDeal : null);
            }
        } catch (err) {
            logger.error("[CRM lookup] unexpected:", err);
            setDeal(null);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    useEffect(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits === lastPhoneRef.current) return;
        lastPhoneRef.current = digits;
        setSearched(false);
        setDeal(null);
        if (digits.length >= 8) {
            searchDeal(digits);
        }
    }, [phone, searchDeal]);

    const refresh = useCallback(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits.length >= 8) searchDeal(digits);
    }, [phone, searchDeal]);

    return { deal, loading, searched, refresh };
};

export const updateDealStage = async (dealId: string, newStage: string) => {
    const probMap: Record<string, number> = {
        lead: 10, qualification: 25, proposal: 55, negotiation: 80, closed_won: 100, closed_lost: 0,
    };
    const { error } = await supabase
        .from("deals")
        .update({ stage: newStage as any, probability: probMap[newStage] ?? 10 })
        .eq("id", dealId);
    if (error) throw error;
};

export const addNoteToDeal = async (dealId: string, note: string) => {
    const { data: existing } = await supabase
        .from("deals")
        .select("notes")
        .eq("id", dealId)
        .single();

    const currentNotes = existing?.notes || "";
    const timestamp = new Date().toLocaleString("pt-BR");
    const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

    const { error } = await supabase
        .from("deals")
        .update({ notes: updatedNotes })
        .eq("id", dealId);
    if (error) throw error;
};
