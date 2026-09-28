import { QuestionDifficulty } from '@prisma/client';

export interface BktParameters {
  priorL0: number; // Initial probability student knows the concept (default: 0.20)
  pTransitT: number; // Probability of transitioning from unlearned to learned state (default: 0.15)
  pGuessG: number; // Probability of guessing correctly despite not knowing (default: 0.20)
  pSlipS: number; // Probability of making a slip/error despite knowing (default: 0.10)
}

export const DEFAULT_BKT_PARAMS: BktParameters = {
  priorL0: 0.2,
  pTransitT: 0.15,
  pGuessG: 0.2,
  pSlipS: 0.1,
};

export interface BktStepResult {
  priorKnowledge: number;
  observation: boolean;
  posteriorKnowledge: number;
  nextPriorKnowledge: number;
}

export interface BktSequenceResult {
  currentProbability: number;
  probabilityPercentage: number;
  attemptsCount: number;
  steps: BktStepResult[];
  modelConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'UNLEARNED' | 'ACQUIRING' | 'MASTERED';
}

export interface IrtAbilityResult {
  theta: number; // Latent ability score, typically -3.0 to +3.0
  abilityPercentile: number; // 0 to 100%
  standardError: number;
  reliability: string;
}

/**
 * Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT) Engine
 * Mathematical implementation of canonical educational data mining models.
 */
export class BktIrtEngine {
  /**
   * Calculates posterior probability of knowledge given an observation P(L_t | obs)
   *
   * If correct:
   *   P(L|C) = (P(L) * (1 - P(S))) / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
   *
   * If incorrect:
   *   P(L|I) = (P(L) * P(S)) / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
   */
  static calculatePosterior(
    priorKnowledge: number,
    isCorrect: boolean,
    params: BktParameters = DEFAULT_BKT_PARAMS,
  ): number {
    const pL = Math.max(0.0001, Math.min(0.9999, priorKnowledge));
    const { pGuessG, pSlipS } = params;

    let posterior: number;
    if (isCorrect) {
      const numerator = pL * (1 - pSlipS);
      const denominator = pL * (1 - pSlipS) + (1 - pL) * pGuessG;
      posterior = denominator === 0 ? pL : numerator / denominator;
    } else {
      const numerator = pL * pSlipS;
      const denominator = pL * pSlipS + (1 - pL) * (1 - pGuessG);
      posterior = denominator === 0 ? pL : numerator / denominator;
    }

    return Math.max(0.0001, Math.min(0.9999, posterior));
  }

  /**
   * Applies the learning transition rule to calculate next prior P(L_{t+1})
   * P(L_{t+1}) = P(L_t | obs) + (1 - P(L_t | obs)) * P(T)
   */
  static applyTransition(
    posteriorKnowledge: number,
    params: BktParameters = DEFAULT_BKT_PARAMS,
  ): number {
    const { pTransitT } = params;
    const nextPrior = posteriorKnowledge + (1 - posteriorKnowledge) * pTransitT;
    return Math.max(0.0001, Math.min(0.9999, nextPrior));
  }

  /**
   * Updates knowledge belief after a single interaction
   */
  static updateKnowledge(
    currentPrior: number,
    isCorrect: boolean,
    params: BktParameters = DEFAULT_BKT_PARAMS,
  ): BktStepResult {
    const posterior = this.calculatePosterior(currentPrior, isCorrect, params);
    const nextPrior = this.applyTransition(posterior, params);

    return {
      priorKnowledge: Math.round(currentPrior * 1000) / 1000,
      observation: isCorrect,
      posteriorKnowledge: Math.round(posterior * 1000) / 1000,
      nextPriorKnowledge: Math.round(nextPrior * 1000) / 1000,
    };
  }

  /**
   * Computes full BKT progression across an ordered chronological sequence of student attempts
   */
  static evaluateAttemptSequence(
    attempts: { isCorrect: boolean }[],
    params: BktParameters = DEFAULT_BKT_PARAMS,
  ): BktSequenceResult {
    if (attempts.length === 0) {
      return {
        currentProbability: params.priorL0,
        probabilityPercentage: Math.round(params.priorL0 * 100),
        attemptsCount: 0,
        steps: [],
        modelConfidence: 'LOW',
        status: 'UNLEARNED',
      };
    }

    let currentKnowledge = params.priorL0;
    const steps: BktStepResult[] = [];

    for (const attempt of attempts) {
      const step = this.updateKnowledge(currentKnowledge, attempt.isCorrect, params);
      steps.push(step);
      currentKnowledge = step.nextPriorKnowledge;
    }

    const pct = Math.round(currentKnowledge * 100);
    const confidence =
      attempts.length >= 10 ? 'HIGH' : attempts.length >= 4 ? 'MEDIUM' : 'LOW';

    let status: 'UNLEARNED' | 'ACQUIRING' | 'MASTERED' = 'UNLEARNED';
    if (pct >= 85) {
      status = 'MASTERED';
    } else if (pct >= 50) {
      status = 'ACQUIRING';
    }

    return {
      currentProbability: Math.round(currentKnowledge * 1000) / 1000,
      probabilityPercentage: pct,
      attemptsCount: attempts.length,
      steps,
      modelConfidence: confidence,
      status,
    };
  }

  /**
   * Maps QuestionDifficulty enum to IRT item difficulty parameter (b)
   */
  static difficultyToIrtParameter(difficulty: QuestionDifficulty): number {
    switch (difficulty) {
      case QuestionDifficulty.EASY:
        return -1.0;
      case QuestionDifficulty.MEDIUM:
        return 0.0;
      case QuestionDifficulty.HARD:
        return 1.2;
      default:
        return 0.0;
    }
  }

  /**
   * Item Response Theory (IRT) 2-Parameter Logistic (2PL) Model:
   * P(theta) = 1 / (1 + exp(-a * (theta - b)))
   * @param theta Student latent ability (-3.0 to +3.0)
   * @param b Item difficulty parameter
   * @param a Item discrimination parameter (default: 1.0)
   */
  static calculateIrtProbability(theta: number, b: number, a: number = 1.0): number {
    const logit = -a * (theta - b);
    return 1 / (1 + Math.exp(logit));
  }

  /**
   * Maximum Likelihood / Expected A Posteriori (EAP) proxy estimation of student latent ability theta
   */
  static estimateStudentAbility(
    attempts: { difficulty: QuestionDifficulty; isCorrect: boolean }[],
  ): IrtAbilityResult {
    if (attempts.length === 0) {
      return {
        theta: 0.0,
        abilityPercentile: 50,
        standardError: 1.0,
        reliability: 'INSUFFICIENT_DATA',
      };
    }

    // Grid search over theta range [-3.0, +3.0] with step 0.1
    let bestTheta = 0.0;
    let maxLogLikelihood = -Infinity;

    for (let candidateTheta = -3.0; candidateTheta <= 3.0; candidateTheta += 0.1) {
      let logLikelihood = 0;
      // Standard normal prior on theta
      logLikelihood -= 0.5 * candidateTheta * candidateTheta;

      for (const attempt of attempts) {
        const b = this.difficultyToIrtParameter(attempt.difficulty);
        const p = this.calculateIrtProbability(candidateTheta, b);
        const prob = attempt.isCorrect ? p : 1 - p;
        logLikelihood += Math.log(Math.max(0.001, prob));
      }

      if (logLikelihood > maxLogLikelihood) {
        maxLogLikelihood = logLikelihood;
        bestTheta = candidateTheta;
      }
    }

    // Convert theta to standard percentile via logistic approximation of normal CDF
    const abilityPercentile = Math.round((1 / (1 + Math.exp(-1.7 * bestTheta))) * 100);
    const standardError = Math.round((1 / Math.sqrt(Math.max(1, attempts.length))) * 100) / 100;

    return {
      theta: Math.round(bestTheta * 100) / 100,
      abilityPercentile,
      standardError,
      reliability: attempts.length >= 10 ? 'HIGH' : attempts.length >= 5 ? 'MODERATE' : 'PRELIMINARY',
    };
  }

  /**
   * Benchmarks EWMA score against BKT probability
   */
  static benchmarkEwmaVsBkt(
    ewmaScore: number,
    bktProbabilityPercentage: number,
  ): {
    ewmaScore: number;
    bktProbabilityPercentage: number;
    difference: number;
    concordance: 'STRONG_AGREEMENT' | 'MODERATE_DIVERGENCE' | 'HIGH_DIVERGENCE';
    recommendedMastery: number;
    explanation: string;
  } {
    const diff = Math.abs(ewmaScore - bktProbabilityPercentage);
    let concordance: 'STRONG_AGREEMENT' | 'MODERATE_DIVERGENCE' | 'HIGH_DIVERGENCE';

    if (diff <= 10) {
      concordance = 'STRONG_AGREEMENT';
    } else if (diff <= 25) {
      concordance = 'MODERATE_DIVERGENCE';
    } else {
      concordance = 'HIGH_DIVERGENCE';
    }

    // Recommended unified score blends both: 60% EWMA (responsive) + 40% BKT (statistically disciplined)
    const recommendedMastery = Math.round(0.6 * ewmaScore + 0.4 * bktProbabilityPercentage);

    const explanation =
      concordance === 'STRONG_AGREEMENT'
        ? 'Both heuristic EWMA and probabilistic BKT models converge on student proficiency.'
        : diff > 20 && ewmaScore > bktProbabilityPercentage
        ? 'EWMA reflects recent consecutive successes, while BKT conservatively accounts for possible guessing slips.'
        : 'BKT indicates underlying conceptual grasp despite recent sporadic errors.';

    return {
      ewmaScore,
      bktProbabilityPercentage,
      difference: Math.round(diff * 10) / 10,
      concordance,
      recommendedMastery,
      explanation,
    };
  }
}
