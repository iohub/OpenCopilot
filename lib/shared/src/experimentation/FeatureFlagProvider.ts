/* eslint-disable no-void */
import { graphqlClient, SourcegraphGraphQLAPIClient } from '../sourcegraph-api/graphql'
import { isError } from '../utils'

export enum FeatureFlag {
    // This flag is only used for testing the behavior of the provider and should not be used in
    // product code
    TestFlagDoNotUse = 'test-flag-do-not-use',

    CodyAutocompleteTracing = 'cody-autocomplete-tracing',
    CodyAutocompleteStarCoder7B = 'cody-autocomplete-default-starcoder-7b',
    CodyAutocompleteStarCoder16B = 'cody-autocomplete-default-starcoder-16b',
    CodyAutocompleteStarCoderHybrid = 'cody-autocomplete-default-starcoder-hybrid',
    CodyAutocompleteLlamaCode7B = 'cody-autocomplete-default-llama-code-7b',
    CodyAutocompleteLlamaCode13B = 'cody-autocomplete-default-llama-code-13b',
    CodyAutocompleteContextLspLight = 'cody-autocomplete-context-lsp-light',
    CodyAutocompleteContextBfg = 'cody-autocomplete-context-bfg',
    CodyAutocompleteContextBfgMixed = 'cody-autocomplete-context-bfg-mixed',
    CodyAutocompleteContextLocalMixed = 'cody-autocomplete-context-local-mixed',
    CodyAutocompleteStarCoderExtendedTokenWindow = 'cody-autocomplete-starcoder-extended-token-window',
    CodyAutocompleteUserLatency = 'cody-autocomplete-user-latency',
    CodyAutocompleteDisableRecyclingOfPreviousRequests = 'cody-autocomplete-disable-recycling-of-previous-requests',
    CodyAutocompleteDynamicMultilineCompletions = 'cody-autocomplete-dynamic-multline-completions',
    CodyPro = 'cody-pro',
    CodyChatMockTest = 'cody-chat-mock-test',
}

const ONE_HOUR = 60 * 60 * 1000

export class FeatureFlagProvider {
    private featureFlags: Record<string, boolean> = {}
    private lastUpdated = 0

    constructor(private apiClient: SourcegraphGraphQLAPIClient) {}

    private getFromCache(flagName: FeatureFlag): boolean | undefined {
        const now = Date.now()
        if (now - this.lastUpdated > ONE_HOUR) {
            // Cache expired, refresh
            void this.refreshFeatureFlags()
        }

        return this.featureFlags[flagName]
    }

    public async evaluateFeatureFlag(flagName: FeatureFlag): Promise<boolean> {
        if (process.env.BENCHMARK_DISABLE_FEATURE_FLAGS) {
            return false
        }

        const cachedValue = this.getFromCache(flagName)
        if (cachedValue !== undefined) {
            return cachedValue
        }

        const value = await this.apiClient.evaluateFeatureFlag(flagName)
        this.featureFlags[flagName] = value === null || isError(value) ? false : value
        return this.featureFlags[flagName]
    }

    public syncAuthStatus(): void {
        void this.refreshFeatureFlags()
    }

    private async refreshFeatureFlags(): Promise<void> {
        const data = await this.apiClient.getEvaluatedFeatureFlags()
        this.featureFlags = isError(data) ? {} : data
        this.lastUpdated = Date.now()
    }
}

export const featureFlagProvider = new FeatureFlagProvider(graphqlClient)
