import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Fish {
  id: string;
  nameRo: string;
  nameSci: string;
  family: string;
  habitatType: 'freshwater' | 'saltwater';
  diet: string;
  maxSize: string;
  legalLimit: string;
  prohibition: string;
  shortDescription: string;
  image: string;
  description: string;
  wikiLink: string;
}

@Component({
  selector: 'app-encyclopedia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './encyclopedia.html',
  styleUrls: ['./encyclopedia.css']
})
export class EncyclopediaComponent implements OnInit {
  
  fishDatabase: Fish[] = [
    // --- DUNĂRE & DELTĂ ---
    { 
      id: 'somn', nameRo: 'Somn', nameSci: 'Silurus glanis', family: 'Siluridae', habitatType: 'freshwater', 
      diet: 'Carnivor (Răpitor)', maxSize: '5 m / 300 kg', legalLimit: '50 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Cel mai mare pește de apă dulce, preferă apele adânci, tulburi și gropile din albiile râurilor.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'crap', nameRo: 'Crap', nameSci: 'Cyprinus carpio', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor', maxSize: '1.2 m / 40 kg', legalLimit: '40 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Trăiește în ape domoale, bălți și lacuri cu vegetație abundentă. Foarte precaut.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'stiuca', nameRo: 'Știucă', nameSci: 'Esox lucius', family: 'Esocidae', habitatType: 'freshwater', 
      diet: 'Carnivor (Răpitor)', maxSize: '1.5 m / 25 kg', legalLimit: '40 cm', prohibition: '1 Feb - 20 Mar',
      shortDescription: 'Prădător de ambuscadă, stă ascunsă în vegetație (stufăriș) în ape limpezi și stătătoare.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'salau', nameRo: 'Șalău', nameSci: 'Sander lucioperca', family: 'Percidae', habitatType: 'freshwater', 
      diet: 'Carnivor', maxSize: '1 m / 15 kg', legalLimit: '40 cm', prohibition: '20 Mar - 7 Iun',
      shortDescription: 'Preferă apele cu fund pietros sau nisipos, adânci și limpezi. Activ mai ales noaptea.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'avat', nameRo: 'Avat', nameSci: 'Aspius aspius', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Carnivor (Ciprinid răpitor)', maxSize: '1.2 m / 12 kg', legalLimit: '30 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Lupul apelor. Preferă curenții puternici de suprafață din marile râuri și Dunăre.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'biban', nameRo: 'Biban', nameSci: 'Perca fluviatilis', family: 'Percidae', habitatType: 'freshwater', 
      diet: 'Carnivor', maxSize: '60 cm / 3 kg', legalLimit: '12 cm', prohibition: '20 Mar - 7 Iun',
      shortDescription: 'Pește de banc, extrem de curios. Trăiește în aproape toate apele dulci, lângă structuri.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'caras', nameRo: 'Caras', nameSci: 'Carassius gibelio', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor', maxSize: '45 cm / 3 kg', legalLimit: '20 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Extrem de rezistent, supraviețuiește în ape cu oxigen puțin. Preferă fundul nămolos.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'platica', nameRo: 'Plătică', nameSci: 'Abramis brama', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor (Bentofag)', maxSize: '80 cm / 6 kg', legalLimit: '25 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Pește de banc, preferă apele adânci și lente din zona de șes și Dunăre.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'mreana', nameRo: 'Mreană', nameSci: 'Barbus barbus', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor', maxSize: '1.2 m / 16 kg', legalLimit: '27 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Iubește curentul puternic și fundul pietros al râurilor colinare și al Dunării.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'rosioara', nameRo: 'Roșioară', nameSci: 'Scardinius erythrophthalmus', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor', maxSize: '50 cm / 2 kg', legalLimit: '15 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Pește de suprafață, stă în bancuri lângă stufăriș și vegetație de mal.',
      image: '', description: '', wikiLink: '' 
    },

    // --- MAREA NEAGRĂ ---
    { 
      id: 'guvide', nameRo: 'Guvide', nameSci: 'Neogobius melanostomus', family: 'Gobiidae', habitatType: 'saltwater', 
      diet: 'Carnivor (Moluște)', maxSize: '25 cm / 200g', legalLimit: '12 cm', prohibition: 'Permis tot anul (Recreativ)',
      shortDescription: 'Pește bentonic (de fund), trăiește printre pietrele de la malul mării.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'stavrid', nameRo: 'Stavrid', nameSci: 'Trachurus mediterraneus', family: 'Carangidae', habitatType: 'saltwater', 
      diet: 'Carnivor (Zooplancton)', maxSize: '60 cm / 1.5 kg', legalLimit: '12 cm', prohibition: 'Permis tot anul (Recreativ)',
      shortDescription: 'Pește pelagic migrator, formează bancuri mari în larg sau la diguri vara.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'hamsie', nameRo: 'Hamsie', nameSci: 'Engraulis encrasicolus', family: 'Engraulidae', habitatType: 'saltwater', 
      diet: 'Planctonofag', maxSize: '20 cm / 40g', legalLimit: '7 cm', prohibition: 'Permis tot anul (Recreativ)',
      shortDescription: 'Pește mic de banc, hrana principală pentru majoritatea răpitorilor marini.',
      image: '', description: '', wikiLink: '' 
    },

    { 
      id: 'zargan', nameRo: 'Zargan', nameSci: 'Belone belone', family: 'Belonidae', habitatType: 'saltwater', 
      diet: 'Carnivor', maxSize: '95 cm / 1.3 kg', legalLimit: 'Fără limită', prohibition: 'Permis tot anul (Recreativ)',
      shortDescription: 'Pește de suprafață cu formă de săgeată și cioc lung, apare la mal primăvara.',
      image: 'assets/images/zargan.jpg', 
      description: '', wikiLink: '' 
    },

    { 
      id: 'chefal', nameRo: 'Chefal (Glat)', nameSci: 'Liza aurata', family: 'Mugilidae', habitatType: 'saltwater', 
      diet: 'Omnivor (Detritivor)', maxSize: '50 cm / 800 g', legalLimit: '25 cm', prohibition: 'Permis tot anul (Recreativ)',
      shortDescription: 'Specie comună de chefal, intră des în porturi și estuare. Are o pată aurie pe opercule.',
      image: 'assets/images/chefal.jpg', description: '', wikiLink: '' 
    },
    { 
      id: 'calcan', nameRo: 'Calcan', nameSci: 'Scophthalmus maximus', family: 'Scophthalmidae', habitatType: 'saltwater', 
      diet: 'Carnivor (Pești de fund)', maxSize: '1 m / 25 kg', legalLimit: '45 cm', prohibition: '15 Apr - 15 Iun',
      shortDescription: 'Maestrul camuflajului, trăiește îngropat în nisipul de pe fundul mării.',
      image: '', description: '', wikiLink: '' 
    },
    { 
      id: 'lufar', nameRo: 'Lufar', nameSci: 'Pomatomus saltatrix', family: 'Pomatomidae', habitatType: 'saltwater', 
      diet: 'Carnivor (Vorace)', maxSize: '1.2 m / 14 kg', legalLimit: 'Fără limită', prohibition: 'Permis tot anul',
      shortDescription: 'Cel mai agresiv răpitor din Marea Neagră, atacă bancurile de stavrizi.',
      image: 'assets/images/lufar.jpg', description: '', wikiLink: '' 
    },

    // --- ALTELE ---
    { 
      id: 'pastrav', nameRo: 'Păstrăv Indigen', nameSci: 'Salmo trutta', family: 'Salmonidae', habitatType: 'freshwater', 
      diet: 'Carnivor (Insecte)', maxSize: '80 cm / 8 kg', legalLimit: '20 cm', prohibition: '1 Oct - 31 Mar',
      shortDescription: 'Regele apelor de munte. Necesită ape reci, cristaline și bine oxigenate.',
      image: 'assets/images/pastrav.jpg', description: '', wikiLink: '' 
    },
    { 
      id: 'clean', nameRo: 'Clean', nameSci: 'Squalius cephalus', family: 'Cyprinidae', habitatType: 'freshwater', 
      diet: 'Omnivor', maxSize: '60 cm / 4 kg', legalLimit: '25 cm', prohibition: '9 Apr - 7 Iun (Generală)',
      shortDescription: 'Omnivorul suprem al râurilor. Mănâncă orice, de la fructe la pești mici.',
      image: '', description: '', wikiLink: '' 
    }
  ];

  filteredFish: Fish[] = [];
  selectedFish: Fish | null = null;
  isLoading = true;
  activeFilter = 'all';

  ngOnInit() {
    this.filteredFish = this.fishDatabase;
    this.loadWikiData();
  }

  async loadWikiData() {
    this.isLoading = true;
    
    const promises = this.fishDatabase.map(async (fish) => {
      
      // ⚠️ CACHE NOU: _v12
      const cacheKey = `wiki_ro_fish_${fish.nameSci}_v12`;
      const cached = localStorage.getItem(cacheKey);

      // Verificăm dacă avem deja o imagine setată manual (ca la Zargan)
      const hasManualImage = fish.image && fish.image !== '';

      if (cached) {
        const data = JSON.parse(cached);
        fish.description = data.description;
        fish.wikiLink = data.wikiLink;
        
        // Dacă NU am pus noi poză (e gol), o luăm din cache
        if (!hasManualImage) {
           fish.image = data.imageUrl;
        }

      } else {
        try {
          const url = `https://ro.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(fish.nameSci)}`;
          const response = await fetch(url);
          const data = await response.json();

          const result = {
            description: data.extract || 'Descrierea nu este disponibilă.',
            imageUrl: data.originalimage ? data.originalimage.source : 'assets/images/fish-placeholder.jpg',
            wikiLink: data.content_urls?.desktop?.page || '#'
          };

          fish.description = result.description;
          fish.wikiLink = result.wikiLink;

          // Dacă NU am pus noi poză (e gol), o luăm de la API
          if (!hasManualImage) {
            fish.image = result.imageUrl;
          }

          localStorage.setItem(cacheKey, JSON.stringify(result));

        } catch (err) {
          if (!hasManualImage) {
             fish.image = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';
          }
        }
      }
    });

    await Promise.all(promises);
    this.isLoading = false;
  }

  // ... restul funcțiilor (filter, modal) rămân la fel ...
  filter(type: string) {
    this.activeFilter = type;
    if (type === 'all') {
      this.filteredFish = this.fishDatabase;
    } else {
      this.filteredFish = this.fishDatabase.filter(f => f.habitatType === type);
    }
  }

  openModal(fish: Fish) {
    this.selectedFish = fish;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.selectedFish = null;
    document.body.style.overflow = 'auto';
  }
}