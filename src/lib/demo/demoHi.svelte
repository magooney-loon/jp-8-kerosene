<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount, createEventDispatcher } from 'svelte';
  import { getHighScores, type HighScore } from '$lib/demo/hudStore';

  const dispatch = createEventDispatcher();
  let highScores: HighScore[] = [];
  let ready = false;

  onMount(() => {
    // Get high scores from localStorage
    highScores = getHighScores();
    
    // Small delay to trigger animations
    setTimeout(() => {
      ready = true;
    }, 100);
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function backToMenu() {
    dispatch('close');
  }
</script>

<div class="highscore-container">
  <div class="highscore-background"></div>
  
  <div class="center-frame">
    <!-- Corner markers -->
    <div class="corner top-left"></div>
    <div class="corner top-right"></div>
    <div class="corner bottom-left"></div>
    <div class="corner bottom-right"></div>
    
    {#if ready}
      <div class="terminal-panel highscore-panel" in:fly={{ y: -20, duration: 800, delay: 200, easing: cubicOut }}>
        <div class="panel-title">JP-8 KEROSENE - HIGH SCORES</div>
        
        {#if highScores.length === 0}
          <div class="no-scores">
            <p>NO MISSION DATA AVAILABLE</p>
            <p>COMPLETE A MISSION TO RECORD PERFORMANCE</p>
          </div>
        {:else}
          <table class="highscore-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>DATE</th>
                <th>EFFICIENCY</th>
                <th>TIME</th>
                <th>HITS</th>
                <th>AMMO</th>
              </tr>
            </thead>
            <tbody>
              {#each highScores as score, index}
                <tr class:highlight={index === 0}>
                  <td class="rank">{index + 1}</td>
                  <td>{formatDate(score.date)}</td>
                  <td class="efficiency">{score.efficiency}%</td>
                  <td>{formatTime(score.timeElapsed)}</td>
                  <td>{score.hits}</td>
                  <td>{score.ammoUsed}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
        
        <button class="back-button" on:click={backToMenu}>
          <span class="button-bg"></span>
          <span class="button-text">RETURN TO MENU</span>
        </button>
      </div>
    {/if}
  </div>

  <div class="footer" in:fade={{ duration: 1000, delay: 1200 }}>
    MIL-DTL-83133 | DEVELOPED BY TEAM-JOINT
  </div>
</div>

<style>
  .highscore-container {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(92, 255, 141, 0.8);
    font-family: 'Consolas', 'Courier New', monospace;
    text-shadow: 0 0 3px rgba(92, 255, 142, 0.3);
    overflow: hidden;
  }
  
  .highscore-background {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(10px);
    z-index: -2;
  }
  
  .center-frame {
    position: relative;
    width: 700px;
    height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .corner {
    position: absolute;
    width: 15px;
    height: 15px;
    border-color: rgba(92, 255, 142, 0.4);
  }
  
  .top-left {
    top: 0;
    left: 0;
    border-top: 1px solid;
    border-left: 1px solid;
  }
  
  .top-right {
    top: 0;
    right: 0;
    border-top: 1px solid;
    border-right: 1px solid;
  }
  
  .bottom-left {
    bottom: 0;
    left: 0;
    border-bottom: 1px solid;
    border-left: 1px solid;
  }
  
  .bottom-right {
    bottom: 0;
    right: 0;
    border-bottom: 1px solid;
    border-right: 1px solid;
  }
  
  .terminal-panel {
    position: relative;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
    padding: 20px;
    width: 600px;
  }
  
  .highscore-panel {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .panel-title {
    font-size: 1.2rem;
    letter-spacing: 2px;
    text-align: center;
    margin-bottom: 15px;
    position: relative;
  }
  
  .panel-title:after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(92, 255, 142, 0.3);
  }
  
  .highscore-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 0.85rem;
  }
  
  .highscore-table th {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(92, 255, 142, 0.3);
    font-size: 0.75rem;
    opacity: 0.9;
    letter-spacing: 1px;
  }
  
  .highscore-table td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(92, 255, 142, 0.2);
    opacity: 0.8;
  }
  
  .highscore-table tr.highlight {
    background: rgba(92, 255, 142, 0.1);
  }
  
  .highscore-table .rank {
    font-weight: bold;
    text-align: center;
  }
  
  .highscore-table .efficiency {
    color: rgba(100, 255, 150, 0.9);
    text-shadow: 0 0 5px rgba(100, 255, 150, 0.3);
  }
  
  .no-scores {
    text-align: center;
    padding: 30px 0;
    opacity: 0.7;
    letter-spacing: 1px;
    line-height: 1.6;
  }
  
  .back-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 8px 10px;
    margin-top: 10px;
    border: 1px solid rgba(92, 255, 142, 0.3);
    background: transparent;
    color: rgba(92, 255, 142, 0.7);
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 0.9rem;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .back-button:hover {
    border-color: rgba(92, 255, 142, 0.8);
    color: rgba(92, 255, 142, 1);
  }

  .button-bg {
    position: absolute;
    inset: 0;
    background: rgba(92, 255, 142, 0);
    transition: background 0.2s;
  }

  .back-button:hover .button-bg {
    background: rgba(92, 255, 142, 0.1);
  }
  
  .button-text {
    position: relative;
    z-index: 1;
  }

  .footer {
    position: absolute;
    bottom: 1.5rem;
    text-align: center;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: rgba(92, 255, 142, 0.5);
  }
</style>
